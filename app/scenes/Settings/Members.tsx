import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import { PlusIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { PAGINATION_SYMBOL } from "~/stores/BaseStore";
import User from "~/models/User";
import Invite from "~/scenes/Invite";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Modal from "~/components/Modal";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import PeopleTable from "./components/PeopleTable";
import UserStatusFilter from "./components/UserStatusFilter";

function Members() {
  const location = useLocation();
  const history = useHistory();
  const [inviteModalOpen, handleInviteModalOpen, handleInviteModalClose] =
    useBoolean();
  const team = useCurrentTeam();
  const { users } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = React.useState<User[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const [userIds, setUserIds] = React.useState<string[]>([]);
  const can = usePolicy(team);
  const query = params.get("query") || "";
  const filter = params.get("filter") || "";
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
        });
        setTotalPages(Math.ceil(response[PAGINATION_SYMBOL].total / limit));
        setUserIds(response.map((u: User) => u.id));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [query, sort, filter, page, direction, users, users.counts.all]);

  React.useEffect(() => {
    let filtered = users.orderedData;

    if (!filter) {
      filtered = users.active.filter((u) => userIds.includes(u.id));
    } else if (filter === "all") {
      filtered = users.orderedData.filter((u) => userIds.includes(u.id));
    } else if (filter === "admins") {
      filtered = users.admins.filter((u) => userIds.includes(u.id));
    } else if (filter === "members") {
      filtered = users.members.filter((u) => userIds.includes(u.id));
    } else if (filter === "suspended") {
      filtered = users.suspended.filter((u) => userIds.includes(u.id));
    } else if (filter === "invited") {
      filtered = users.invited.filter((u) => userIds.includes(u.id));
    } else if (filter === "viewers") {
      filtered = users.viewers.filter((u) => userIds.includes(u.id));
    }

    // sort the resulting data by the original order from the server
    setData(sortBy(filtered, (item) => userIds.indexOf(item.id)));
  }, [
    filter,
    users.active,
    users.admins,
    users.members,
    users.orderedData,
    users.suspended,
    users.invited,
    users.viewers,
    userIds,
  ]);

  const handleFilter = React.useCallback(
    (filter) => {
      if (filter) {
        params.set("filter", filter);
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
                onClick={handleInviteModalOpen}
                icon={<PlusIcon />}
              >
                {t("Invite people")}…
              </Button>
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("Members")}</Heading>
      <Text type="secondary">
        <Trans>
          Everyone that has signed into {{ appName }} is listed here. It’s
          possible that there are other users who have access through{" "}
          {team.signinMethods} but haven’t signed in yet.
        </Trans>
      </Text>
      <Flex gap={8}>
        <InputSearch
          short
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
        />
        <LargeUserStatusFilter activeKey={filter} onSelect={handleFilter} />
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
      {can.inviteUser && (
        <Modal
          title={t("Invite people")}
          onRequestClose={handleInviteModalClose}
          isOpen={inviteModalOpen}
        >
          <Invite onSubmit={handleInviteModalClose} />
        </Modal>
      )}
    </Scene>
  );
}

const LargeUserStatusFilter = styled(UserStatusFilter)`
  height: 32px;
`;

export default observer(Members);
