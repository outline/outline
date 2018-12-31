// @flow
import * as React from 'react';
import Avatar from 'components/Avatar';
import Button from 'components/Button';
import ListItem from 'components/List/Item';
import User from 'models/User';

type Props = {
  user: User,
  showAdd: boolean,
  onAdd: () => *,
};

const UserListItem = ({ user, onAdd, showAdd }: Props) => {
  return (
    <ListItem
      title={user.name}
      image={<Avatar src={user.avatarUrl} size={32} />}
      actions={
        showAdd ? (
          <Button type="button" onClick={onAdd}>
            Invite
          </Button>
        ) : (
          undefined
        )
      }
    />
  );
};

export default UserListItem;
