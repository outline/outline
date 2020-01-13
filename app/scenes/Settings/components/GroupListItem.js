// @flow
import * as React from 'react';
import styled from 'styled-components';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import GroupMenu from 'menus/GroupMenu';
import Modal from 'components/Modal';
import GroupMembers from 'scenes/GroupMembers';
// import Avatar from 'components/Avatar';
// import Badge from 'components/Badge';
// import UserProfile from 'scenes/UserProfile';
import ListItem from 'components/List/Item';
// import Time from 'shared/components/Time';
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
    const membersCount = groupMemberships.inGroup(group.id).length;

    return (
      <React.Fragment>
        <ListItem
          title={
            <Title onClick={this.handleMembersModalOpen}>{group.name}</Title>
          }
          subtitle={
            <React.Fragment>
              {membersCount} member{membersCount === 1 ? '' : 's'}
            </React.Fragment>
          }
          actions={
            showMenu ? (
              <GroupMenu
                group={group}
                onMembers={this.handleMembersModalOpen}
              />
            ) : (
              undefined
            )
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
