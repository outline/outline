// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observer, inject } from 'mobx-react';
import { observable } from 'mobx';

import AuthStore from 'stores/AuthStore';
import UsersStore from 'stores/UsersStore';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import UserListItem from './components/UserListItem';
import List from 'components/List';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';
import InvitePeople from 'scenes/InvitePeople';

type Props = {
  auth: AuthStore,
  users: UsersStore,
  match: Object,
};

@observer
class People extends React.Component<Props> {

  @observable showInviteModal: boolean = false;

  componentDidMount() {
    this.props.users.fetchPage({ limit: 100 });
  }

  toggleInvitePeople = () => {
    this.showInviteModal = !this.showInviteModal;
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
    }

    return (
      <CenteredContent>
        <PageTitle title="People" />
        <h1>成员</h1>
        <HelpText>
          每一个注册了大事记的成员都会出现在这里，            
          你也可以<a onClick={this.toggleInvitePeople}>邀请成员</a>。
        </HelpText>

        {this.showInviteModal && (
          <InvitePeople onRequestClose={this.toggleInvitePeople} />
        )}

        <Tabs>
          <Tab to="/settings/people" exact>
            活跃
          </Tab>
          <Tab to="/settings/people/admins" exact>
            管理员
          </Tab>
          <Tab to="/settings/people/all" exact>
            所有人
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
