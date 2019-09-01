// @flow
import * as React from 'react';
import Avatar from 'components/Avatar';
import Flex from 'shared/components/Flex';
import Time from 'shared/components/Time';
import ListItem from 'components/List/Item';
import User from 'models/User';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  user: User,
  canEdit: boolean,
  onRemove: () => void,
};

const MemberListItem = ({ user, onRemove, canEdit }: Props) => {
  return (
    <ListItem
      title={user.name}
      subtitle={
        <React.Fragment>
          Joined <Time dateTime={user.createdAt} /> ago
        </React.Fragment>
      }
      image={<Avatar src={user.avatarUrl} size={32} />}
      actions={
        <Flex align="center">
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuItem onClick={onRemove}>Remove</DropdownMenuItem>
            </DropdownMenu>
          )}
        </Flex>
      }
    />
  );
};

export default MemberListItem;
