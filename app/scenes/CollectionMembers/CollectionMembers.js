// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { PlusIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';
import Button from 'components/Button';
import PaginatedList from 'components/PaginatedList';
import Modal from 'components/Modal';
import Collection from 'models/Collection';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import MembershipsStore from 'stores/MembershipsStore';
import UsersStore from 'stores/UsersStore';
import MemberListItem from './components/MemberListItem';
import AddPeopleToCollection from './AddPeopleToCollection';

type Props = {
  ui: UiStore,
  auth: AuthStore,
  collection: Collection,
  users: UsersStore,
  memberships: MembershipsStore,
  onEdit: () => void,
};

@observer
class CollectionMembers extends React.Component<Props> {
  @observable addModalOpen: boolean = false;

  handleAddModalOpen = () => {
    this.addModalOpen = true;
  };

  handleAddModalClose = () => {
    this.addModalOpen = false;
  };

  handleRemoveUser = user => {
    try {
      this.props.memberships.delete({
        collectionId: this.props.collection.id,
        userId: user.id,
      });
      this.props.ui.showToast(`${user.name} was removed from the collection`);
    } catch (err) {
      this.props.ui.showToast('Could not remove user');
    }
  };

  handleUpdateUser = (user, permission) => {
    try {
      this.props.memberships.create({
        collectionId: this.props.collection.id,
        userId: user.id,
        permission,
      });
      this.props.ui.showToast(`${user.name} permissions were updated`);
    } catch (err) {
      this.props.ui.showToast('Could not update user');
    }
  };

  render() {
    const { collection, users, memberships, auth } = this.props;
    const { user } = auth;
    if (!user) return null;

    const key = memberships.orderedData.map(m => m.permission).join('-');

    return (
      <Flex column>
        {collection.private ? (
          <React.Fragment>
            <HelpText>
              Choose which team members have access to view and edit documents
              in the private <strong>{collection.name}</strong> collection. You
              can make this collection visible to the entire team by{' '}
              <a role="button" onClick={this.props.onEdit}>
                changing its visibility
              </a>.
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
        ) : (
          <HelpText>
            The <strong>{collection.name}</strong> collection is accessible by
            everyone on the team. If you want to limit who can view the
            collection,{' '}
            <a role="button" onClick={this.props.onEdit}>
              make it private
            </a>.
          </HelpText>
        )}

        <Subheading>Members</Subheading>
        <PaginatedList
          key={key}
          items={
            collection.private
              ? users.inCollection(collection.id)
              : users.orderedData
          }
          fetch={collection.private ? memberships.fetchPage : users.fetchPage}
          options={collection.private ? { id: collection.id } : undefined}
          renderItem={item => (
            <MemberListItem
              key={item.id}
              user={item}
              membership={memberships.get(`${item.id}-${collection.id}`)}
              canEdit={collection.private && item.id !== user.id}
              onRemove={() => this.handleRemoveUser(item)}
              onUpdate={permission => this.handleUpdateUser(item, permission)}
            />
          )}
        />
        <Modal
          title={`Add people to ${collection.name}`}
          onRequestClose={this.handleAddModalClose}
          isOpen={this.addModalOpen}
        >
          <AddPeopleToCollection
            collection={collection}
            onSubmit={this.handleAddModalClose}
          />
        </Modal>
      </Flex>
    );
  }
}

export default inject('auth', 'users', 'memberships', 'ui')(CollectionMembers);
