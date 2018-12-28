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
import Switch from 'components/Switch';
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
  @observable filter: string;

  componentDidMount() {
    this.props.users.fetchPage();
    this.props.collection.fetchUsers();
  }

  addUser = user => {
    this.props.collection.addUser(user);
  };

  removeUser = user => {
    this.props.collection.removeUser(user);
  };

  handlePrivateChange = async (ev: SyntheticInputEvent<*>) => {
    const { collection } = this.props;
    collection.private = !ev.target.checked;
    await collection.save();

    if (collection.private) {
      await collection.fetchUsers();
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
    const filteredUsers = reject(
      otherUsers,
      user => this.filter && !user.name.toLowerCase().includes(this.filter)
    );

    return (
      <Flex column>
        <HelpText>
          Choose which people on the team have access to read and edit documents
          in the <strong>{collection.name}</strong> collection.
        </HelpText>

        <Switch
          id="private"
          label="Visible to all team members"
          onChange={this.handlePrivateChange}
          checked={!collection.private}
        />

        {collection.private && (
          <Fade>
            <Flex column>
              <Subheading>Has Access ({collection.users.length})</Subheading>
              <List>
                {collection.users.map(member => (
                  <MemberListItem
                    key={member.id}
                    user={member}
                    showRemove={user.id !== member.id}
                    onRemove={() => this.removeUser(member)}
                  />
                ))}
              </List>

              {hasOtherUsers && (
                <React.Fragment>
                  <Subheading>Other Team Members</Subheading>
                  <Input onChange={this.handleFilter} placeholder="Filter…" />
                  <List>
                    {filteredUsers.map(member => (
                      <UserListItem
                        key={member.id}
                        user={member}
                        onAdd={() => this.addUser(member)}
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

export default inject('auth', 'users')(CollectionPermissions);
