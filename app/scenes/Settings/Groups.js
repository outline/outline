// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { PlusIcon } from 'outline-icons';

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
import Tabs, { Separator } from 'components/Tabs';
import Tab from 'components/Tab';

import AuthStore from 'stores/AuthStore';
import UsersStore from 'stores/UsersStore';
import PoliciesStore from 'stores/PoliciesStore';

type Props = {
  auth: AuthStore,
  users: UsersStore,
  policies: PoliciesStore,
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
    const { auth, policies, match } = this.props;
    const { filter } = match.params;
    const currentUser = auth.user;
    const team = auth.team;
    invariant(currentUser, 'User should exist');
    invariant(team, 'Team should exist');

    let users = this.props.users.active;
    if (filter === 'all') {
      users = this.props.users.all;
    } else if (filter === 'admins') {
      users = this.props.users.admins;
    } else if (filter === 'suspended') {
      users = this.props.users.suspended;
    } else if (filter === 'invited') {
      users = this.props.users.invited;
    }

    const showLoading = this.props.users.isFetching && !users.length;
    const showEmpty = this.props.users.isLoaded && !users.length;
    const can = policies.abilities(team.id);

    return (
      <CenteredContent>
        <PageTitle title="People" />
        <h1>People</h1>
        <HelpText>
          Everyone that has signed into Outline appears here. It’s possible that
          there are other users who have access through {team.signinMethods} but
          haven’t signed in yet.
        </HelpText>
        <Button
          type="button"
          data-on="click"
          data-event-category="invite"
          data-event-action="peoplePage"
          onClick={this.handleInviteModalOpen}
          icon={<PlusIcon />}
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
          {can.update && (
            <Tab to="/settings/people/suspended" exact>
              Suspended
            </Tab>
          )}
          <Tab to="/settings/people/all" exact>
            Everyone
          </Tab>

          {can.invite && (
            <React.Fragment>
              <Separator />
              <Tab to="/settings/people/invited" exact>
                Invited
              </Tab>
            </React.Fragment>
          )}
        </Tabs>
        <List>
          {users.map(user => (
            <UserListItem
              key={user.id}
              user={user}
              showMenu={can.update && currentUser.id !== user.id}
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

export default inject('auth', 'users', 'policies')(People);
