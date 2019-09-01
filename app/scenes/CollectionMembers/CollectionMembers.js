// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { PlusIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';
import Button from 'components/Button';
import PaginatedList from 'components/PaginatedList';
import Collection from 'models/Collection';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import MembershipsStore from 'stores/MembershipsStore';
import UsersStore from 'stores/UsersStore';
import MemberListItem from './components/MemberListItem';

type Props = {
  ui: UiStore,
  auth: AuthStore,
  collection: Collection,
  users: UsersStore,
  memberships: MembershipsStore,
};

@observer
class CollectionMembers extends React.Component<Props> {
  handleAddPeople = () => {
    // TODO
  };

  handleRemoveUser = user => {
    try {
      this.props.collection.removeUser(user);
    } catch (err) {
      this.props.ui.showToast(`${user.name} was removed from the collection`);
      this.props.ui.showToast('Could not remove user');
    }
  };

  render() {
    const { collection, users, memberships, auth } = this.props;
    const { user } = auth;
    if (!user) return null;

    return (
      <Flex column>
        {collection.private ? (
          <React.Fragment>
            <HelpText>
              Choose which team members have access to view and edit documents
              in the private <strong>{collection.name}</strong> collection. You
              can make this collection visible to the entire team by changing
              its visibility.
            </HelpText>
            <span>
              <Button
                type="button"
                onClick={this.handleAddPeople}
                icon={<PlusIcon />}
                neutral
              >
                Add people…
              </Button>
            </span>
          </React.Fragment>
        ) : (
          <HelpText>
            The <strong>{collection.name}</strong> collection is accessible by
            everyone on the team. If you want to limit who can view the
            collection, make it private.
          </HelpText>
        )}

        <Subheading>Members</Subheading>
        <PaginatedList
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
              canEdit={collection.private && item.id !== user.id}
              onRemove={() => this.handleRemoveUser(item.id)}
            />
          )}
        />
      </Flex>
    );
  }
}

export default inject('auth', 'users', 'memberships', 'ui')(CollectionMembers);
