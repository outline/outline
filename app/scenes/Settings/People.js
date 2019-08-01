// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';

import AuthStore from 'stores/AuthStore';
import UsersStore from 'stores/UsersStore';
import Empty from 'components/Empty';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Modal from 'components/Modal';
import Button from 'components/Button';
import Invite from 'scenes/Invite';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import UserListItem from './components/UserListItem';
import List from 'components/List';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';

type Props = {
  auth: AuthStore,
  users: UsersStore,
  match: Object,
};

@observer
class People extends React.Component<Props> {
  @observable inviteModalOpen: boolean = false;

  componentDidMount() {
    this.props.users.fetchPage({ limit: 100 });
  }

  handleInviteModalOpen = () => {
    this.inviteModalOpen = true;
  };

  handleInviteModalClose = () => {
    this.inviteModalOpen = false;
  };

  render() {
    const { auth, match } = this.props;
    const { filter } = match.params;
    const currentUser = auth.user;
    invariant(currentUser, 'User should exist');

    let users = this.props.users.active;
    if (filter === 'all') {
      users = this.props.users.orderedData;
    } else if (filter === 'admins') {
      users = this.props.users.admins;
    } else if (filter === 'suspended') {
      users = this.props.users.suspended;
    }

    const showLoading = this.props.users.isFetching && !users.length;
    const showEmpty = this.props.users.isLoaded && !users.length;

    return (
      <CenteredContent>
        <PageTitle title="People" />
        <h1>People</h1>
        <HelpText>
          Everyone that has signed into Outline appears here. It’s possible that
          there are other users who have access through Single Sign-On but
          haven’t signed into Outline yet.
        </HelpText>
        <Button
          type="button"
          data-on="click"
          data-event-category="invite"
          data-event-action="peoplePage"
          onClick={this.handleInviteModalOpen}
          neutral
        >
          Invite people…
        </Button>

        <Tabs>
          <Tab to="/settings/people" exact>
            Active
          </Tab>
          <Tab to="/settings/people/admins" exact>
            Admins
          </Tab>
          {currentUser.isAdmin && (
            <Tab to="/settings/people/suspended" exact>
              Suspended
            </Tab>
          )}
          <Tab to="/settings/people/all" exact>
            Everyone
          </Tab>
        </Tabs>
        <List>
          {users.map(user => (
            <UserListItem
              key={user.id}
              user={user}
              showMenu={!!currentUser.isAdmin && currentUser.id !== user.id}
            />
          ))}
        </List>
        {showEmpty && <Empty>No people to see here.</Empty>}
        {showLoading && <ListPlaceholder count={5} />}

        <Modal
          title="Invite people"
          onRequestClose={this.handleInviteModalClose}
          isOpen={this.inviteModalOpen}
        >
          <Invite onSubmit={this.handleInviteModalClose} />
        </Modal>
      </CenteredContent>
    );
  }
}

export default inject('auth', 'users')(People);
