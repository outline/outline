import type { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { PlusIcon, UserIcon, TrashIcon } from "outline-icons";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import type UsersStore from "~/stores/UsersStore";
import { queriedUsers } from "~/stores/UsersStore";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import { ConditionalFade } from "~/components/Fade";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { inviteUser } from "~/actions/definitions/users";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { ExportCSV } from "./components/ExportCSV";
import { MembersTable } from "./components/MembersTable";
import { StickyFilters } from "./components/StickyFilters";
import UserRoleFilter from "./components/UserRoleFilter";
import UserStatusFilter from "./components/UserStatusFilter";
import { HStack } from "~/components/primitives/HStack";

function Members() {
  const appName = env.APP_NAME;
  const location = useLocation();
  const history = useHistory();
  const team = useCurrentTeam();
  const { users, dialogs } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const can = usePolicy(team);
  const [query, setQuery] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
      filter: params.get("filter") || "active",
      role: params.get("role") || undefined,
      sort: params.get("sort") || "name",
      direction: (params.get("direction") || "asc").toUpperCase() as
        | "ASC"
        | "DESC",
    }),
    [params]
  );

  const sort: ColumnSort = useMemo(
    () => ({
      id: reqParams.sort,
      desc: reqParams.direction === "DESC",
    }),
    [reqParams.sort, reqParams.direction]
  );

  const { data, error, loading, next } = useTableRequest({
    data: getFilteredUsers({
      users,
      query: reqParams.query,
      filter: reqParams.filter,
      role: reqParams.role,
    }),
    sort,
    reqFn: users.fetchPage,
    reqParams,
  });

  const updateParams = useCallback(
    (name: string, value: string) => {
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleStatusFilter = useCallback(
    (status) => updateParams("filter", status),
    [updateParams]
  );

  const handleRoleFilter = useCallback(
    (role) => updateParams("role", role),
    [updateParams]
  );

  const handleSearch = useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load members"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

  const handleDeactivateInactiveKeycloak = useCallback(async () => {
    setIsDeactivating(true);
    try {
      const result = await users.deactivateInactiveKeycloak(180);
      toast.success(
        t("Deactivated {{count}} inactive Keycloak users", {
          count: result.deactivatedCount,
        })
      );
      dialogs.closeAllModals();
      // Refresh users list
      await users.fetchPage({});
    } catch (err) {
      toast.error(
        t("Failed to deactivate inactive users: {{error}}", {
          error: err instanceof Error ? err.message : String(err),
        })
      );
    } finally {
      setIsDeactivating(false);
    }
  }, [users, t, dialogs]);

  const handleOpenDeactivateDialog = useCallback(() => {
    dialogs.openModal({
      title: t("Deactivate Inactive Keycloak Users"),
      content: (
        <>
          <Text>
            {t(
              "This will deactivate all inactive Keycloak users who haven't logged in for 6 months or more. They will be:"
            )}
          </Text>
          <ul>
            <li>{t("Removed from all groups")}</li>
            <li>{t("Added to 'Deactivated Users' collection")}</li>
            <li>
              {t(
                "Automatically restored to their previous groups when they sign in again"
              )}
            </li>
          </ul>
          <Text type="secondary">
            {t(
              "This action cannot be undone, but users can sign in again to be restored."
            )}
          </Text>
          <HStack spacing={8} justify="flex-end" style={{ marginTop: 16 }}>
            <Button
              type="button"
              onClick={dialogs.closeAllModals}
              disabled={isDeactivating}
              neutral
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleDeactivateInactiveKeycloak}
              disabled={isDeactivating}
              danger
            >
              {isDeactivating
                ? t("Deactivating…")
                : t("Deactivate Inactive Users")}
            </Button>
          </HStack>
        </>
      ),
    });
  }, [dialogs, t, isDeactivating, handleDeactivateInactiveKeycloak]);

  return (
    <Scene
      title={t("Members")}
      icon={<UserIcon />}
      actions={
        <>
          {can.inviteUser && (
            <Action>
              <Button
                type="button"
                data-on="click"
                data-event-category="invite"
                data-event-action="peoplePage"
                action={inviteUser}
                icon={<PlusIcon />}
              >
                {t("Invite people")}…
              </Button>
            </Action>
          )}
        </>
      }
      wide
    >
      <Heading>{t("Members")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Everyone that has signed into {{ appName }} is listed here. It’s
          possible that there are other users who have access through{" "}
          {{ signinMethods: team.signinMethods }} but haven’t signed in yet.
        </Trans>
      </Text>
      <StickyFilters justify="space-between">
        <HStack>
          <InputSearch
            short
            value={query}
            placeholder={`${t("Filter")}…`}
            onChange={handleSearch}
          />
          <LargeUserStatusFilter
            activeKey={reqParams.filter ?? ""}
            onSelect={handleStatusFilter}
          />
          <LargeUserRoleFilter
            activeKey={reqParams.role ?? ""}
            onSelect={handleRoleFilter}
          />
        </HStack>
        <ExportCSV reqParams={reqParams} />
      </StickyFilters>
      <ConditionalFade animate={!data}>
        <MembersTable
          data={data ?? []}
          sort={sort}
          canManage={can.update}
          loading={loading}
          page={{
            hasNext: !!next,
            fetchNext: next,
          }}
        />
      </ConditionalFade>
      {can.update && (
        <DeactivateSection>
          <Heading as="h3">{t("Keycloak User Management")}</Heading>
          <Text as="p" type="secondary">
            {t(
              "Deactivate all inactive Keycloak users who haven't logged in for 6 months. They will be removed from groups and added to a 'Deactivated Users' collection. If they sign in again, they will be automatically restored to their previous groups."
            )}
          </Text>
          <Button
            type="button"
            onClick={handleOpenDeactivateDialog}
            icon={<TrashIcon />}
            danger
          >
            {t("Deactivate Inactive Keycloak Users")}
          </Button>
        </DeactivateSection>
      )}
    </Scene>
  );
}

function getFilteredUsers({
  users,
  query,
  filter,
  role,
}: {
  users: UsersStore;
  query?: string;
  filter?: string;
  role?: string;
}) {
  let filteredUsers;

  switch (filter) {
    case "all":
      filteredUsers = users.all;
      break;
    case "suspended":
      filteredUsers = users.suspended;
      break;
    case "invited":
      filteredUsers = users.invited;
      break;
    default:
      filteredUsers = users.active;
  }

  if (role) {
    filteredUsers = filteredUsers.filter((user) => user.role === role);
  }

  if (query) {
    filteredUsers = queriedUsers(filteredUsers, query);
  }

  return filteredUsers;
}

const LargeUserStatusFilter = styled(UserStatusFilter)`
  height: 32px;
`;

const LargeUserRoleFilter = styled(UserRoleFilter)`
  height: 32px;
`;

const DeactivateSection = styled.div`
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid ${(props) => props.theme.divider};

  h3 {
    margin-bottom: 8px;
  }

  p {
    margin-bottom: 16px;
  }
`;

export default observer(Members);
