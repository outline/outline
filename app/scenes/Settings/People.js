// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observer, inject } from 'mobx-react';

import AuthStore from 'stores/AuthStore';
import UsersStore from 'stores/UsersStore';
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
  componentDidMount() {
    this.props.users.fetchPage({ limit: 100 });
  }

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
    }

    return (
      <CenteredContent>
        <PageTitle title="People" />
        <h1>People</h1>
        <HelpText>
          Everyone that has signed into Outline appears here. It’s possible that
          there are other users who have access through Single Sign-On but
          haven’t signed into Outline yet.
        </HelpText>

        <Tabs>
          <Tab to="/settings/people" exact>
            Active
          </Tab>
          <Tab to="/settings/people/admins" exact>
            Admins
          </Tab>
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
      </CenteredContent>
    );
  }
}

export default inject('auth', 'users')(People);
