import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import { PlusIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { PAGINATION_SYMBOL } from "~/stores/base/Store";
import User from "~/models/User";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
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
import PeopleTable from "./components/PeopleTable";
import UserRoleFilter from "./components/UserRoleFilter";
import UserStatusFilter from "./components/UserStatusFilter";

function Members() {
  const location = useLocation();
  const history = useHistory();
  const team = useCurrentTeam();
  const context = useActionContext();
  const { users } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = React.useState<User[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const [userIds, setUserIds] = React.useState<string[]>([]);
  const can = usePolicy(team);
  const query = params.get("query") || undefined;
  const filter = params.get("filter") || undefined;
  const role = params.get("role") || undefined;
  const sort = params.get("sort") || "name";
  const direction = (params.get("direction") || "asc").toUpperCase() as
    | "ASC"
    | "DESC";
  const page = parseInt(params.get("page") || "0", 10);
  const limit = 25;

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        const response = await users.fetchPage({
          offset: page * limit,
          limit,
          sort,
          direction,
          query,
          filter,
          role,
        });
        setTotalPages(Math.ceil(response[PAGINATION_SYMBOL].total / limit));
        setUserIds(response.map((u: User) => u.id));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [query, sort, filter, role, page, direction, users]);

  React.useEffect(() => {
    let filtered = users.orderedData;

    if (!filter) {
      filtered = users.active.filter((u) => userIds.includes(u.id));
    } else if (filter === "all") {
      filtered = users.orderedData.filter((u) => userIds.includes(u.id));
    } else if (filter === "suspended") {
      filtered = users.suspended.filter((u) => userIds.includes(u.id));
    } else if (filter === "invited") {
      filtered = users.invited.filter((u) => userIds.includes(u.id));
    }

    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }

    // sort the resulting data by the original order from the server
    setData(sortBy(filtered, (item) => userIds.indexOf(item.id)));
  }, [
    filter,
    role,
    users.active,
    users.orderedData,
    users.suspended,
    users.invited,
    userIds,
  ]);

  const handleStatusFilter = React.useCallback(
    (f) => {
      if (f) {
        params.set("filter", f);
        params.delete("page");
      } else {
        params.delete("filter");
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleRoleFilter = React.useCallback(
    (r) => {
      if (r) {
        params.set("role", r);
        params.delete("page");
      } else {
        params.delete("role");
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleSearch = React.useCallback(
    (event) => {
      const { value } = event.target;

      if (value) {
        params.set("query", event.target.value);
        params.delete("page");
      } else {
        params.delete("query");
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const appName = env.APP_NAME;

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
      <Flex gap={8}>
        <InputSearch
          short
          value={query ?? ""}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
        />
        <LargeUserStatusFilter
          activeKey={filter ?? ""}
          onSelect={handleStatusFilter}
        />
        <LargeUserRoleFilter
          activeKey={role ?? ""}
          onSelect={handleRoleFilter}
        />
      </Flex>
      <PeopleTable
        data={data}
        canManage={can.update}
        isLoading={isLoading}
        page={page}
        pageSize={limit}
        totalPages={totalPages}
        defaultSortDirection="ASC"
      />
    </Scene>
  );
}

const LargeUserStatusFilter = styled(UserStatusFilter)`
  height: 32px;
`;

const LargeUserRoleFilter = styled(UserRoleFilter)`
  height: 32px;
`;

export default observer(Members);
