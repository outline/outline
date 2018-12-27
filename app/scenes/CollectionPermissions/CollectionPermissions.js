// @flow
import * as React from 'react';
import { reject } from 'lodash';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';
import List from 'components/List';
import UserListItem from './components/UserListItem';
import MemberListItem from './components/MemberListItem';
import Collection from 'models/Collection';
import UsersStore from 'stores/UsersStore';
import AuthStore from 'stores/AuthStore';

type Props = {
  users: UsersStore,
  auth: AuthStore,
  collection: Collection,
};

@observer
class CollectionPermissions extends React.Component<Props> {
  @observable isSaving: boolean;

  componentDidMount() {
    this.props.users.fetchPage();
    this.props.collection.fetchUsers();
  }

  addUser = async user => {
    const { collection } = this.props;
    if (!collection.private) {
      collection.private = true;
      await collection.save();
    }

    collection.addUser(user);
  };

  removeUser = user => {
    this.props.collection.removeUser(user);
  };

  render() {
    const { collection, users, auth } = this.props;
    const { user } = auth;
    if (!user) return null;

    const otherUsers = reject(users.active, user =>
      collection.userIds.includes(user.id)
    );
    const hasOtherUsers = !!otherUsers.length;

    return (
      <Flex column>
        <HelpText>
          Choose which people on the team have access to the{' '}
          <strong>{collection.name}</strong> collection.
        </HelpText>

        <Flex column>
          <Subheading>Has Access ({collection.users.length})</Subheading>
          <List>
            {collection.users.map(member => (
              <MemberListItem
                user={member}
                showRemove={user.id !== member.id}
                onRemove={() => this.removeUser(member)}
              />
            ))}
          </List>

          {hasOtherUsers && (
            <React.Fragment>
              <Subheading>No Access</Subheading>
              <List>
                {otherUsers.map(member => (
                  <UserListItem
                    user={member}
                    onAdd={() => this.addUser(member)}
                    showAdd
                  />
                ))}
              </List>
            </React.Fragment>
          )}
        </Flex>
      </Flex>
    );
  }
}

export default inject('auth', 'users')(CollectionPermissions);
