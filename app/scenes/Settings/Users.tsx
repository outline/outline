import type { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { PlusIcon, UserIcon } from "outline-icons";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import type { Filter } from "@shared/helpers/FilterHelper";
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
import { UsersTable } from "./components/UsersTable";
import { StickyFilters } from "./components/StickyFilters";
import UserRoleFilter from "./components/UserRoleFilter";
import UserStatusFilter from "./components/UserStatusFilter";
import { HStack } from "~/components/primitives/HStack";

function Users() {
  const appName = env.APP_NAME;
  const location = useLocation();
  const history = useHistory();
  const team = useCurrentTeam();
  const { users } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const can = usePolicy(team);
  const [query, setQuery] = useState("");

  const status = params.get("filter") || "active";
  const role = params.get("role") || undefined;

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
      filters: getUserFilters({ status, role }),
      sort: params.get("sort") || "name",
      direction: (params.get("direction") || "asc").toUpperCase() as
        | "ASC"
        | "DESC",
    }),
    [params, status, role]
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
      filter: status,
      role,
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
      toast.error(t("Could not load users"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

  return (
    <Scene
      title={t("Users")}
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
      <Heading>{t("Users")}</Heading>
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
            activeKey={status}
            onSelect={handleStatusFilter}
          />
          <LargeUserRoleFilter
            activeKey={role ?? ""}
            onSelect={handleRoleFilter}
          />
        </HStack>
        <ExportCSV reqParams={reqParams} />
      </StickyFilters>
      <ConditionalFade animate={!data}>
        <UsersTable
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
    </Scene>
  );
}

function getUserFilters({
  status,
  role,
}: {
  status: string;
  role?: string;
}): Filter[] {
  const filters: Filter[] = [];

  if (role) {
    filters.push({ field: "role", operator: "eq", value: role });
  }

  switch (status) {
    case "all":
      // Suspended users are excluded unless the expression references
      // suspendedAt, so match on either state.
      filters.push({
        operator: "OR",
        filters: [
          { field: "suspendedAt", operator: "isNull" },
          { field: "suspendedAt", operator: "isNotNull" },
        ],
      });
      break;
    case "suspended":
      filters.push({ field: "suspendedAt", operator: "isNotNull" });
      break;
    case "invited":
      filters.push({ field: "lastActiveAt", operator: "isNull" });
      break;
    default:
      filters.push(
        { field: "lastActiveAt", operator: "isNotNull" },
        { field: "suspendedAt", operator: "isNull" }
      );
  }

  return filters;
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

export default observer(Users);
