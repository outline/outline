// @flow
import { debounce } from "lodash";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import AuthStore from "stores/AuthStore";
import GroupMembershipsStore from "stores/GroupMembershipsStore";
import UiStore from "stores/UiStore";
import UsersStore from "stores/UsersStore";
import Group from "models/Group";
import Invite from "scenes/Invite";
import Empty from "components/Empty";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import GroupMemberListItem from "./components/GroupMemberListItem";

type Props = {
  ui: UiStore,
  auth: AuthStore,
  group: Group,
  groupMemberships: GroupMembershipsStore,
  users: UsersStore,
  onSubmit: () => void,
};

@observer
class AddPeopleToGroup extends React.Component<Props> {
  @observable inviteModalOpen: boolean = false;
  @observable query: string = "";

  handleInviteModalOpen = () => {
    this.inviteModalOpen = true;
  };

  handleInviteModalClose = () => {
    this.inviteModalOpen = false;
  };

  handleFilter = (ev: SyntheticInputEvent<HTMLInputElement>) => {
    this.query = ev.target.value;
    this.debouncedFetch();
  };

  debouncedFetch = debounce(() => {
    this.props.users.fetchPage({
      query: this.query,
    });
  }, 250);

  handleAddUser = async (user) => {
    try {
      await this.props.groupMemberships.create({
        groupId: this.props.group.id,
        userId: user.id,
      });
      this.props.ui.showToast(`${user.name} was added to the group`);
    } catch (err) {
      this.props.ui.showToast("Could not add user");
    }
  };

  render() {
    const { users, group, auth } = this.props;
    const { user, team } = auth;
    if (!user || !team) return null;

    return (
      <Flex column>
        <HelpText>
          Add team members below to give them access to the group. Need to add
          someone who’s not yet on the team yet?{" "}
          <a role="button" onClick={this.handleInviteModalOpen}>
            Invite them to {team.name}
          </a>
          .
        </HelpText>

        <Input
          type="search"
          placeholder="Search by name…"
          value={this.query}
          onChange={this.handleFilter}
          label="Search people"
          labelHidden
          autoFocus
          flex
        />
        <PaginatedList
          empty={
            this.query ? (
              <Empty>No people matching your search</Empty>
            ) : (
              <Empty>No people left to add</Empty>
            )
          }
          items={users.notInGroup(group.id, this.query)}
          fetch={this.query ? undefined : users.fetchPage}
          renderItem={(item) => (
            <GroupMemberListItem
              key={item.id}
              user={item}
              onAdd={() => this.handleAddUser(item)}
              canEdit
            />
          )}
        />
        <Modal
          title="Invite people"
          onRequestClose={this.handleInviteModalClose}
          isOpen={this.inviteModalOpen}
        >
          <Invite onSubmit={this.handleInviteModalClose} />
        </Modal>
      </Flex>
    );
  }
}

export default inject(
  "auth",
  "users",
  "groupMemberships",
  "ui"
)(AddPeopleToGroup);
