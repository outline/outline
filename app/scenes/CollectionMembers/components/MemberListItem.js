// @flow
import * as React from 'react';
import Avatar from 'components/Avatar';
import Flex from 'shared/components/Flex';
import Time from 'shared/components/Time';
import Badge from 'components/Badge';
import Button from 'components/Button';
import ListItem from 'components/List/Item';
import User from 'models/User';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  user: User,
  canEdit: boolean,
  onAdd?: () => void,
  onRemove?: () => void,
};

const MemberListItem = ({ user, onRemove, onAdd, canEdit }: Props) => {
  return (
    <ListItem
      title={user.name}
      subtitle={
        <React.Fragment>
          Joined <Time dateTime={user.createdAt} /> ago
          {user.isAdmin && <Badge admin={user.isAdmin}>Admin</Badge>}
        </React.Fragment>
      }
      image={<Avatar src={user.avatarUrl} size={32} />}
      actions={
        <Flex align="center">
          {canEdit &&
            onRemove && (
              <DropdownMenu>
                <DropdownMenuItem onClick={onRemove}>Remove</DropdownMenuItem>
              </DropdownMenu>
            )}
          {canEdit &&
            onAdd && (
              <Button onClick={onAdd} neutral>
                Add
              </Button>
            )}
        </Flex>
      }
    />
  );
};

export default MemberListItem;
