// @flow
import * as React from 'react';
import { reject } from 'lodash';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Flex from 'shared/components/Flex';
import Fade from 'components/Fade';
import Input from 'components/Input';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';
import List from 'components/List';
import Placeholder from 'components/List/Placeholder';
import Switch from 'components/Switch';
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
  @observable isSaving: boolean;
  @observable filter: string;

  componentDidMount() {
    this.props.users.fetchPage();
    this.props.collection.fetchUsers();
  }

  handlePrivateChange = async (ev: SyntheticInputEvent<*>) => {
    const { collection } = this.props;

    try {
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
      this.props.collection.addUser(user);
    } catch (err) {
      this.props.ui.showToast('Could not add user');
    }
  };

  handleRemoveUser = user => {
    try {
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
          Choose which people on the team have access to read and edit documents
          in the <strong>{collection.name}</strong> collection. By default
          collections are visible to all team members.
        </HelpText>

        <Switch
          id="private"
          label="Private collection"
          onChange={this.handlePrivateChange}
          checked={collection.private}
        />

        {collection.private && (
          <Fade>
            <Flex column>
              <Subheading>Invited ({collection.users.length})</Subheading>
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
                  <Subheading>Team Members</Subheading>
                  <Input
                    onChange={this.handleFilter}
                    placeholder="Filter…"
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
          </Fade>
        )}
      </Flex>
    );
  }
}

export default inject('auth', 'ui', 'users')(CollectionPermissions);
