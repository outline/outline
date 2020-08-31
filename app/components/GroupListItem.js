// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { MAX_AVATAR_DISPLAY } from "shared/constants";
import GroupMembershipsStore from "stores/GroupMembershipsStore";
import CollectionGroupMembership from "models/CollectionGroupMembership";
import Group from "models/Group";
import GroupMembers from "scenes/GroupMembers";
import Facepile from "components/Facepile";
import Flex from "components/Flex";
import ListItem from "components/List/Item";
import Modal from "components/Modal";

type Props = {
  group: Group,
  groupMemberships: GroupMembershipsStore,
  membership?: CollectionGroupMembership,
  showFacepile: boolean,
  renderActions: ({ openMembersModal: () => void }) => React.Node,
};

@observer
class GroupListItem extends React.Component<Props> {
  @observable membersModalOpen: boolean = false;

  handleMembersModalOpen = () => {
    this.membersModalOpen = true;
  };

  handleMembersModalClose = () => {
    this.membersModalOpen = false;
  };

  render() {
    const { group, groupMemberships, showFacepile, renderActions } = this.props;

    const memberCount = group.memberCount;

    const membershipsInGroup = groupMemberships.inGroup(group.id);
    const users = membershipsInGroup
      .slice(0, MAX_AVATAR_DISPLAY)
      .map((gm) => gm.user);

    const overflow = memberCount - users.length;

    return (
      <>
        <ListItem
          title={
            <Title onClick={this.handleMembersModalOpen}>{group.name}</Title>
          }
          subtitle={
            <>
              {memberCount} member{memberCount === 1 ? "" : "s"}
            </>
          }
          actions={
            <Flex align="center">
              {showFacepile && (
                <Facepile
                  onClick={this.handleMembersModalOpen}
                  users={users}
                  overflow={overflow}
                />
              )}
              &nbsp;
              {renderActions({
                openMembersModal: this.handleMembersModalOpen,
              })}
            </Flex>
          }
        />
        <Modal
          title="Group members"
          onRequestClose={this.handleMembersModalClose}
          isOpen={this.membersModalOpen}
        >
          <GroupMembers group={group} onSubmit={this.handleMembersModalClose} />
        </Modal>
      </>
    );
  }
}

const Title = styled.span`
  &:hover {
    text-decoration: underline;
    cursor: pointer;
  }
`;

export default inject("groupMemberships")(GroupListItem);
