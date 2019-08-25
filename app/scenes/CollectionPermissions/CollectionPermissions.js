// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { PlusIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';
import Button from 'components/Button';
import List from 'components/List';
import Placeholder from 'components/List/Placeholder';
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

  componentDidMount() {
    this.props.users.fetchPage();
    // TODO
    // this.props.collection.fetchUsers();
  }

  componentWillUnmount() {
    if (this.isEdited) {
      this.props.ui.showToast('Permissions were updated');
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
        // TODO
        // await collection.fetchUsers();
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

  handleAddPeople = () => {};

  render() {
    const { collection, users, auth } = this.props;
    const { user } = auth;
    if (!user) return null;

    const isFirstLoadingUsers =
      collection.isLoadingUsers && !collection.users.length;

    return (
      <Flex column>
        {collection.private ? (
          <React.Fragment>
            <HelpText>
              Choose which team members have access to view and edit documents
              in the private <strong>{collection.name}</strong> collection. You
              can make this collection visible to the whole team by making it
              not private.
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
            Choose which team members have access to edit documents in the{' '}
            <strong>{collection.name}</strong> collection. Need to limit who can
            view? Make it private.
          </HelpText>
        )}

        <Subheading>Members</Subheading>
        <List>
          {isFirstLoadingUsers ? (
            <Placeholder />
          ) : (
            (collection.private ? collection.users : users.active).map(
              member => (
                <MemberListItem
                  key={member.id}
                  user={member}
                  showRemove={user.id !== member.id}
                  onRemove={() => this.handleRemoveUser(member)}
                />
              )
            )
          )}
        </List>
      </Flex>
    );
  }
}

export default inject('auth', 'ui', 'users')(CollectionPermissions);
