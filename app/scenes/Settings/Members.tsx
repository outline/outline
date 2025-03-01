import { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { PlusIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import UsersStore, { queriedUsers } from "~/stores/UsersStore";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import { ConditionalFade } from "~/components/Fade";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { inviteUser } from "~/actions/definitions/users";
import env from "~/env";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { MembersTable } from "./components/MembersTable";
import { StickyFilters } from "./components/StickyFilters";
import UserRoleFilter from "./components/UserRoleFilter";
import UserStatusFilter from "./components/UserStatusFilter";

function Members() {
  const appName = env.APP_NAME;
  const location = useLocation();
  const history = useHistory();
  const team = useCurrentTeam();
  const context = useActionContext();
  const { users } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const can = usePolicy(team);
  const [query, setQuery] = React.useState("");

  const reqParams = React.useMemo(
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

  const sort: ColumnSort = React.useMemo(
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

  const updateParams = React.useCallback(
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

  const handleStatusFilter = React.useCallback(
    (status) => updateParams("filter", status),
    [updateParams]
  );

  const handleRoleFilter = React.useCallback(
    (role) => updateParams("role", role),
    [updateParams]
  );

  const handleSearch = React.useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

  React.useEffect(() => {
    if (error) {
      toast.error(t("Could not load members"));
    }
  }, [t, error]);

  React.useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

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
                context={context}
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
      <StickyFilters gap={8}>
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
      filteredUsers = users.orderedData;
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

export default observer(Members);
