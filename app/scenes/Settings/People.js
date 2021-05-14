// @flow
import { observer } from "mobx-react";
import { PlusIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import Invite from "scenes/Invite";
import { Action } from "components/Actions";
import Button from "components/Button";
import Flex from "components/Flex";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import InputSearch from "components/InputSearch";
import Modal from "components/Modal";
import Scene from "components/Scene";
import PeopleTable from "./components/PeopleTable";
import StatusFilter from "./components/StatusFilter";
import useCurrentTeam from "hooks/useCurrentTeam";
import useQuery from "hooks/useQuery";
import useStores from "hooks/useStores";

function People(props) {
  const location = useLocation();
  const history = useHistory();
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const team = useCurrentTeam();
  const { users, policies } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const [data, setData] = React.useState([]);
  const query = params.get("query") || "";
  const filter = params.get("filter") || "";

  React.useEffect(() => {
    users.fetchCounts(team.id);
  }, [users, team]);

  const fetchData = React.useCallback(
    async ({ offset, sort, direction }) => {
      const data = await users.fetchPage({
        offset,
        sort,
        direction,
        query,
        includeSuspended: true,
      });
      setData(data);
    },
    [query, users]
  );

  const handleInviteModalOpen = React.useCallback(() => {
    setInviteModalOpen(true);
  }, []);

  const handleInviteModalClose = React.useCallback(() => {
    setInviteModalOpen(false);
  }, []);

  const handleFilter = React.useCallback(
    (filter) => {
      if (filter) {
        params.set("filter", filter);
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
      params.set("query", event.target.value);
      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  // let data = users.active;
  // if (filter === "all") {
  //   data = users.all;
  // } else if (filter === "admins") {
  //   data = users.admins;
  // } else if (filter === "suspended") {
  //   data = users.suspended;
  // } else if (filter === "invited") {
  //   data = users.invited;
  // } else if (filter === "viewers") {
  //   data = users.viewers;
  // }

  const can = policies.abilities(team.id);

  return (
    <Scene
      title={t("People")}
      icon={<UserIcon color="currentColor" />}
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
      <Heading>{t("People")}</Heading>
      <HelpText>
        <Trans>
          Everyone that has signed into Outline appears here. It’s possible that
          there are other users who have access through {team.signinMethods} but
          haven’t signed in yet.
        </Trans>
      </HelpText>
      <Flex gap={8}>
        <InputSearch
          short
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
        />
        <StatusFilter activeKey={filter} onSelect={handleFilter} />
      </Flex>
      <PeopleTable
        data={data}
        fetchData={fetchData}
        pageCount={1}
        canUpdate={can.update}
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

export default observer(People);
