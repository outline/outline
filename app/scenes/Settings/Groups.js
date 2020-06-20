// @flow
import * as React from "react";
import invariant from "invariant";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { PlusIcon } from "outline-icons";

import Empty from "components/Empty";
import { ListPlaceholder } from "components/LoadingPlaceholder";
import Modal from "components/Modal";
import Button from "components/Button";
import GroupNew from "scenes/GroupNew";
import CenteredContent from "components/CenteredContent";
import PageTitle from "components/PageTitle";
import HelpText from "components/HelpText";
import GroupListItem from "components/GroupListItem";
import List from "components/List";
import Tabs from "components/Tabs";
import Tab from "components/Tab";
import GroupMenu from "menus/GroupMenu";

import AuthStore from "stores/AuthStore";
import GroupsStore from "stores/GroupsStore";
import PoliciesStore from "stores/PoliciesStore";

type Props = {
  auth: AuthStore,
  groups: GroupsStore,
  policies: PoliciesStore,
  match: Object,
};

@observer
class Groups extends React.Component<Props> {
  @observable newGroupModalOpen: boolean = false;

  componentDidMount() {
    this.props.groups.fetchPage({ limit: 100 });
  }

  handleNewGroupModalOpen = () => {
    this.newGroupModalOpen = true;
  };

  handleNewGroupModalClose = () => {
    this.newGroupModalOpen = false;
  };

  render() {
    const { auth, policies, groups } = this.props;
    const currentUser = auth.user;
    const team = auth.team;

    invariant(currentUser, "User should exist");
    invariant(team, "Team should exist");

    const showLoading = groups.isFetching && !groups.orderedData.length;
    const showEmpty = groups.isLoaded && !groups.orderedData.length;
    const can = policies.abilities(team.id);

    return (
      <CenteredContent>
        <PageTitle title="People" />
        <h1>Groups</h1>
        <HelpText>
          Groups can be used to organize and manage the people on your team.
        </HelpText>

        {can.group && (
          <Button
            type="button"
            onClick={this.handleNewGroupModalOpen}
            icon={<PlusIcon />}
            neutral
          >
            New group…
          </Button>
        )}

        <Tabs>
          <Tab to="/settings/groups" exact>
            All Groups
          </Tab>
        </Tabs>

        <List>
          {groups.orderedData.map(group => (
            <GroupListItem
              key={group.id}
              group={group}
              renderActions={({ openMembersModal }) => (
                <GroupMenu group={group} onMembers={openMembersModal} />
              )}
              showFacepile
            />
          ))}
        </List>

        {showEmpty && <Empty>No groups to see here.</Empty>}
        {showLoading && <ListPlaceholder count={5} />}

        <Modal
          title="Create a group"
          onRequestClose={this.handleNewGroupModalClose}
          isOpen={this.newGroupModalOpen}
        >
          <GroupNew onSubmit={this.handleNewGroupModalClose} />
        </Modal>
      </CenteredContent>
    );
  }
}

export default inject("auth", "groups", "policies")(Groups);
