// @flow
import * as React from 'react';
import styled from 'styled-components';
import Avatar from 'components/Avatar';
import Flex from 'shared/components/Flex';
import Time from 'shared/components/Time';
import Badge from 'components/Badge';
import Button from 'components/Button';
import InputSelect from 'components/InputSelect';
import ListItem from 'components/List/Item';
import User from 'models/User';
import Membership from 'models/Membership';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

const PERMISSIONS = [
  { label: 'Read only', value: 'read' },
  { label: 'Read & Edit', value: 'read_write' },
];
type Props = {
  user: User,
  membership?: ?Membership,
  canEdit: boolean,
  onAdd?: () => void,
  onRemove?: () => void,
  onUpdate?: (permission: string) => void,
};

const MemberListItem = ({
  user,
  membership,
  onRemove,
  onUpdate,
  onAdd,
  canEdit,
}: Props) => {
  return (
    <ListItem
      title={user.name}
      subtitle={
        <React.Fragment>
          {user.lastActiveAt ? (
            <React.Fragment>
              Active <Time dateTime={user.lastActiveAt} /> ago
            </React.Fragment>
          ) : (
            'Never signed in'
          )}
          {!user.lastActiveAt && <Badge>Invited</Badge>}
          {user.isAdmin && <Badge admin={user.isAdmin}>Admin</Badge>}
        </React.Fragment>
      }
      image={<Avatar src={user.avatarUrl} size={40} />}
      actions={
        <Flex align="center">
          {canEdit &&
            onUpdate && (
              <Select
                label="Permissions"
                options={PERMISSIONS}
                value={membership ? membership.permission : undefined}
                onChange={ev => onUpdate(ev.target.value)}
                labelHidden
              />
            )}
          &nbsp;&nbsp;
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

const Select = styled(InputSelect)`
  margin: 0;
  font-size: 14px;
`;

export default MemberListItem;
