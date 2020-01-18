// @flow
import * as React from 'react';
import styled from 'styled-components';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { MAX_AVATAR_DISPLAY } from 'shared/constants';
import GroupMenu from 'menus/GroupMenu';
import Modal from 'components/Modal';
import Flex from 'shared/components/Flex';
import Facepile from 'components/Facepile';
import GroupMembers from 'scenes/GroupMembers';
import ListItem from 'components/List/Item';
import Group from 'models/Group';
import GroupMembershipsStore from 'stores/GroupMembershipsStore';

type Props = {
  group: Group,
  showMenu: boolean,
  groupMemberships: GroupMembershipsStore,
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

  onEdit = () => {};

  render() {
    const { group, groupMemberships, showMenu } = this.props;
    const memberCount = group.memberCount;

    const membershipsInGroup = groupMemberships.inGroup(group.id);
    const users = membershipsInGroup
      .slice(0, MAX_AVATAR_DISPLAY)
      .map(gm => gm.user);

    const overflow = memberCount - users.length;

    return (
      <React.Fragment>
        <ListItem
          title={
            <Title onClick={this.handleMembersModalOpen}>{group.name}</Title>
          }
          subtitle={
            <React.Fragment>
              {memberCount} member{memberCount === 1 ? '' : 's'}
            </React.Fragment>
          }
          actions={
            <Flex align="center">
              <Facepile users={users} overflow={overflow} />
              &nbsp;&nbsp;
              {showMenu && (
                <GroupMenu
                  group={group}
                  onMembers={this.handleMembersModalOpen}
                />
              )}
            </Flex>
          }
        />
        <Modal
          title="Group Members"
          onRequestClose={this.handleMembersModalClose}
          isOpen={this.membersModalOpen}
        >
          <GroupMembers
            group={group}
            onSubmit={this.handleMembersModalClose}
            onEdit={this.onEdit}
          />
        </Modal>
      </React.Fragment>
    );
  }
}

const Title = styled.span`
  &:hover {
    text-decoration: underline;
    cursor: pointer;
  }
`;

export default inject('groupMemberships')(GroupListItem);
