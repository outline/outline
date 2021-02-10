// @flow
import invariant from "invariant";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { withTranslation, type TFunction, Trans } from "react-i18next";
import { type Match } from "react-router-dom";
import AuthStore from "stores/AuthStore";
import PoliciesStore from "stores/PoliciesStore";
import UsersStore from "stores/UsersStore";
import Invite from "scenes/Invite";
import Bubble from "components/Bubble";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import HelpText from "components/HelpText";
import Modal from "components/Modal";
import PageTitle from "components/PageTitle";
import PaginatedList from "components/PaginatedList";
import Tab from "components/Tab";
import Tabs, { Separator } from "components/Tabs";

import UserListItem from "./components/UserListItem";

type Props = {
  auth: AuthStore,
  users: UsersStore,
  policies: PoliciesStore,
  match: Match,
  t: TFunction,
};

@observer
class People extends React.Component<Props> {
  @observable inviteModalOpen: boolean = false;

  componentDidMount() {
    const { team } = this.props.auth;
    if (team) {
      this.props.users.fetchCounts(team.id);
    }
  }

  handleInviteModalOpen = () => {
    this.inviteModalOpen = true;
  };

  handleInviteModalClose = () => {
    this.inviteModalOpen = false;
  };

  fetchPage = (params) => {
    return this.props.users.fetchPage({ ...params, includeSuspended: true });
  };

  render() {
    const { auth, policies, match, t } = this.props;
    const { filter } = match.params;
    const currentUser = auth.user;
    const team = auth.team;
    invariant(currentUser, "User should exist");
    invariant(team, "Team should exist");

    let users = this.props.users.active;
    if (filter === "all") {
      users = this.props.users.all;
    } else if (filter === "admins") {
      users = this.props.users.admins;
    } else if (filter === "suspended") {
      users = this.props.users.suspended;
    } else if (filter === "invited") {
      users = this.props.users.invited;
    }

    const can = policies.abilities(team.id);
    const { counts } = this.props.users;

    return (
      <CenteredContent>
        <PageTitle title={t("People")} />
        <h1>{t("People")}</h1>
        <HelpText>
          <Trans>
            Everyone that has signed into Outline appears here. It’s possible
            that there are other users who have access through{" "}
            {team.signinMethods} but haven’t signed in yet.
          </Trans>
        </HelpText>
        <Button
          type="button"
          data-on="click"
          data-event-category="invite"
          data-event-action="peoplePage"
          onClick={this.handleInviteModalOpen}
          icon={<PlusIcon />}
          neutral
        >
          {t("Invite people")}…
        </Button>

        <Tabs>
          <Tab to="/settings/people" exact>
            {t("Active")} <Bubble count={counts.active} />
          </Tab>
          <Tab to="/settings/people/admins" exact>
            {t("Admins")} <Bubble count={counts.admins} />
          </Tab>
          {can.update && (
            <Tab to="/settings/people/suspended" exact>
              {t("Suspended")} <Bubble count={counts.suspended} />
            </Tab>
          )}
          <Tab to="/settings/people/all" exact>
            {t("Everyone")} <Bubble count={counts.all - counts.invited} />
          </Tab>
          {can.invite && (
            <>
              <Separator />
              <Tab to="/settings/people/invited" exact>
                {t("Invited")} <Bubble count={counts.invited} />
              </Tab>
            </>
          )}
        </Tabs>
        <PaginatedList
          items={users}
          empty={<Empty>{t("No people to see here.")}</Empty>}
          fetch={this.fetchPage}
          renderItem={(item) => (
            <UserListItem
              key={item.id}
              user={item}
              showMenu={can.update && currentUser.id !== item.id}
            />
          )}
        />

        <Modal
          title={t("Invite people")}
          onRequestClose={this.handleInviteModalClose}
          isOpen={this.inviteModalOpen}
        >
          <Invite onSubmit={this.handleInviteModalClose} />
        </Modal>
      </CenteredContent>
    );
  }
}

export default inject(
  "auth",
  "users",
  "policies"
)(withTranslation()<People>(People));
