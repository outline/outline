// @flow
import * as React from 'react';
import Avatar from 'components/Avatar';
import Button from 'components/Button';
import ListItem from 'components/List/Item';
import User from 'models/User';

type Props = {
  user: User,
  showRemove: boolean,
  onRemove: () => *,
};

const MemberListItem = ({ user, onRemove, showRemove }: Props) => {
  return (
    <ListItem
      key={user.id}
      title={user.name}
      image={<Avatar src={user.avatarUrl} size={32} />}
      actions={
        showRemove ? (
          <Button type="button" onClick={onRemove} neutral>
            Remove
          </Button>
        ) : (
          undefined
        )
      }
    />
  );
};

export default MemberListItem;
