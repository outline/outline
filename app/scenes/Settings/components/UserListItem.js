// @flow
import * as React from 'react';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';

import UserMenu from 'menus/UserMenu';
import Avatar from 'components/Avatar';
import ListItem from 'components/List/Item';
import type { User } from '../../../types';

type Props = {
  user: User,
  isCurrentUser: boolean,
};

const UserListItem = ({ user, isCurrentUser }: Props) => {
  return (
    <ListItem
      key={user.id}
      title={user.name}
      image={<Avatar src={user.avatarUrl} size={40} />}
      subtitle={
        <React.Fragment>
          {user.username ? user.username : user.email}
          {user.isAdmin && <Badge admin={user.isAdmin}>Admin</Badge>}
          {user.isSuspended && <Badge>Suspended</Badge>}
        </React.Fragment>
      }
      actions={isCurrentUser ? undefined : <UserMenu user={user} />}
    />
  );
};

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

export default UserListItem;
