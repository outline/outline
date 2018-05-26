// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observer, inject } from 'mobx-react';

import AuthStore from 'stores/AuthStore';
import UsersStore from 'stores/UsersStore';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import UserListItem from './components/UserListItem';
import List from 'components/List';

type Props = {
  auth: AuthStore,
  users: UsersStore,
};

@observer
class Members extends React.Component<Props> {
  componentDidMount() {
    this.props.users.fetchPage({ limit: 100 });
  }

  render() {
    const { users, auth } = this.props;
    const currentUser = auth.user;
    invariant(currentUser, 'User should exist');

    return (
      <CenteredContent>
        <PageTitle title="Members" />
        <h1>Members</h1>

        <List>
          {users.data.map(user => (
            <UserListItem
              key={user.id}
              user={user}
              isCurrentUser={currentUser.id === user.id}
            />
          ))}
        </List>
      </CenteredContent>
    );
  }
}

export default inject('auth', 'users')(Members);
