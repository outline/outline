// @flow
import * as React from 'react';
import { reject } from 'lodash';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Flex from 'shared/components/Flex';
import Input from 'components/Input';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';
import List from 'components/List';
import Placeholder from 'components/List/Placeholder';
import UserListItem from './components/UserListItem';
import MemberListItem from './components/MemberListItem';
import Collection from 'models/Collection';
import UsersStore from 'stores/UsersStore';
import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';

type Props = {
  users: UsersStore,
  ui: UiStore,
  auth: AuthStore,
  collection: Collection,
};

@observer
class CollectionPermissions extends React.Component<Props> {
  @observable isEdited: boolean = false;
  @observable isSaving: boolean = false;
  @observable filter: string;

  componentDidMount() {
    this.props.users.fetchPage();
    this.props.collection.fetchUsers();
  }

  componentWillUnmount() {
    if (this.isEdited) {
      this.props.ui.showToast('Permissions updated');
    }
  }

  handlePrivateChange = async (ev: SyntheticInputEvent<HTMLInputElement>) => {
    console.log('handlePrivateChange');
    ev.preventDefault();
    ev.stopPropagation();

    const { collection } = this.props;

    try {
      this.isEdited = true;
      collection.private = ev.target.checked;
      await collection.save();

      if (collection.private) {
        await collection.fetchUsers();
      }
    } catch (err) {
      collection.private = !ev.target.checked;
      this.props.ui.showToast('Collection privacy could not be changed');
    }
  };

  handleAddUser = user => {
    try {
      this.isEdited = true;
      this.props.collection.addUser(user);
    } catch (err) {
      this.props.ui.showToast('Could not add user');
    }
  };

  handleRemoveUser = user => {
    try {
      this.isEdited = true;
      this.props.collection.removeUser(user);
    } catch (err) {
      this.props.ui.showToast('Could not remove user');
    }
  };

  handleFilter = (ev: SyntheticInputEvent<*>) => {
    this.filter = ev.target.value.toLowerCase();
  };

  render() {
    const { collection, users, auth } = this.props;
    const { user } = auth;
    if (!user) return null;

    const otherUsers = reject(users.active, user =>
      collection.userIds.includes(user.id)
    );
    const hasOtherUsers = !!otherUsers.length;
    const isFirstLoadingUsers =
      collection.isLoadingUsers && !collection.users.length;
    const filteredUsers = reject(
      otherUsers,
      user => this.filter && !user.name.toLowerCase().includes(this.filter)
    );

    return (
      <Flex column>
        <HelpText>
          Choose which team members have access to read and edit documents in
          the <strong>{collection.name}</strong> collection.
        </HelpText>

        <Subheading>Members</Subheading>
        <List>
          {isFirstLoadingUsers ? (
            <Placeholder />
          ) : (
            collection.users.map(member => (
              <MemberListItem
                key={member.id}
                user={member}
                showRemove={user.id !== member.id}
                onRemove={() => this.handleRemoveUser(member)}
              />
            ))
          )}
        </List>

        {hasOtherUsers && (
          <React.Fragment>
            <Subheading>Others</Subheading>
            <Input
              onChange={this.handleFilter}
              placeholder="Find a team member…"
              value={this.filter}
              type="search"
            />
            <List>
              {filteredUsers.map(member => (
                <UserListItem
                  key={member.id}
                  user={member}
                  onAdd={() => this.handleAddUser(member)}
                  showAdd
                />
              ))}
            </List>
          </React.Fragment>
        )}
      </Flex>
    );
  }
}

export default inject('auth', 'ui', 'users')(CollectionPermissions);
