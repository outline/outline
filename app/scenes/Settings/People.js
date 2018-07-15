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

type Props = {
  auth: AuthStore,
  users: UsersStore,
};

@observer
class People extends React.Component<Props> {
  componentDidMount() {
    this.props.users.fetchPage({ limit: 100 });
  }

  render() {
    const { users, auth } = this.props;
    const currentUser = auth.user;
    invariant(currentUser, 'User should exist');

    return (
      <CenteredContent>
        <PageTitle title="People" />
        <h1>People</h1>
        <HelpText>
          Everyone that has signed in to your Outline appear here. It’s possible
          that there are other people who have access but haven’t signed in yet.
        </HelpText>

        <List>
          {users.data.map(user => (
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
