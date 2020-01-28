// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { PlusIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';
import Empty from 'components/Empty';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';
import Button from 'components/Button';
import PaginatedList from 'components/PaginatedList';
import Modal from 'components/Modal';
import Group from 'models/Group';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import GroupMembershipsStore from 'stores/GroupMembershipsStore';
import UsersStore from 'stores/UsersStore';
import GroupMemberListItem from './components/GroupMemberListItem';
import AddPeopleToGroup from './AddPeopleToGroup';

type Props = {
  ui: UiStore,
  auth: AuthStore,
  group: Group,
  users: UsersStore,
  groupMemberships: GroupMembershipsStore,
};

@observer
class GroupMembers extends React.Component<Props> {
  @observable addModalOpen: boolean = false;

  handleAddModalOpen = () => {
    this.addModalOpen = true;
  };

  handleAddModalClose = () => {
    this.addModalOpen = false;
  };

  handleRemoveUser = user => {
    try {
      this.props.groupMemberships.delete({
        groupId: this.props.group.id,
        userId: user.id,
      });
      this.props.ui.showToast(`${user.name} was removed from the group`);
    } catch (err) {
      this.props.ui.showToast('Could not remove user');
    }
  };

  render() {
    const { group, users, groupMemberships, auth } = this.props;
    const { user } = auth;
    if (!user) return null;

    return (
      <Flex column>
        <React.Fragment>
          <HelpText>
            Choose which team members belong in the{' '}
            <strong>{group.name}</strong> group.
          </HelpText>
          <span>
            <Button
              type="button"
              onClick={this.handleAddModalOpen}
              icon={<PlusIcon />}
              neutral
            >
              Add people
            </Button>
          </span>
        </React.Fragment>

        <Subheading>Members</Subheading>
        <PaginatedList
          items={users.inGroup(group.id)}
          fetch={groupMemberships.fetchPage}
          options={{ id: group.id }}
          empty={<Empty>This group has no members.</Empty>}
          renderItem={item => (
            <GroupMemberListItem
              key={item.id}
              user={item}
              membership={groupMemberships.get(`${item.id}-${group.id}`)}
              onRemove={() => this.handleRemoveUser(item)}
            />
          )}
        />
        <Modal
          title={`Add people to ${group.name}`}
          onRequestClose={this.handleAddModalClose}
          isOpen={this.addModalOpen}
        >
          <AddPeopleToGroup group={group} onSubmit={this.handleAddModalClose} />
        </Modal>
      </Flex>
    );
  }
}

export default inject('auth', 'users', 'groupMemberships', 'ui')(GroupMembers);
