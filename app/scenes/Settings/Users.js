// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import Avatar from 'components/Avatar';
import { color } from 'shared/styles/constants';

import UserMenu from 'menus/UserMenu';
import AuthStore from 'stores/AuthStore';
import UsersStore from 'stores/UsersStore';
import CenteredContent from 'components/CenteredContent';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import PageTitle from 'components/PageTitle';

type Props = {
  auth: AuthStore,
  users: UsersStore,
};

@observer
class Users extends React.Component<Props> {
  componentDidMount() {
    this.props.users.fetchPage({ limit: 100 });
  }

  render() {
    const currentUser = this.props.auth.user;
    invariant(currentUser, 'User should exist');

    return (
      <CenteredContent>
        <PageTitle title="Users" />
        <h1>Users</h1>

        {!this.props.users.isLoaded ? (
          <Flex column>
            {this.props.users.data && (
              <UserList column>
                {this.props.users.data.map(user => (
                  <User key={user.id} justify="space-between" auto>
                    <UserDetails suspended={user.isSuspended}>
                      <Avatar src={user.avatarUrl} />
                      <UserName>
                        {user.name} {user.email && `(${user.email})`}
                        {user.isAdmin && (
                          <Badge admin={user.isAdmin}>Admin</Badge>
                        )}
                        {user.isSuspended && <Badge>Suspended</Badge>}
                      </UserName>
                    </UserDetails>
                    <Flex>
                      {currentUser.id !== user.id && <UserMenu user={user} />}
                    </Flex>
                  </User>
                ))}
              </UserList>
            )}
          </Flex>
        ) : (
          <LoadingPlaceholder />
        )}
      </CenteredContent>
    );
  }
}

const UserList = styled(Flex)`
  border: 1px solid ${color.smoke};
  border-radius: 4px;

  margin-top: 20px;
  margin-bottom: 40px;
`;

const User = styled(Flex)`
  padding: 10px;
  border-bottom: 1px solid ${color.smoke};
  font-size: 15px;

  &:last-child {
    border-bottom: none;
  }
`;

const UserDetails = styled(Flex)`
  opacity: ${({ suspended }) => (suspended ? 0.5 : 1)};
`;

const UserName = styled.span`
  padding-left: 8px;
`;

const Badge = styled.span`
  margin-left: 10px;
  padding: 2px 6px 3px;
  background-color: ${({ admin }) => (admin ? color.primary : color.smokeDark)};
  color: ${({ admin }) => (admin ? color.white : color.text)};
  border-radius: 2px;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: normal;
`;

export default inject('auth', 'users')(Users);
