// @flow
import * as React from "react";
import GroupMembership from "models/GroupMembership";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Button from "components/Button";
import { DropdownMenu, DropdownMenuItem } from "components/DropdownMenu";
import Flex from "components/Flex";
import ListItem from "components/List/Item";
import Time from "components/Time";

type Props = {
  user: User,
  groupMembership?: ?GroupMembership,
  onAdd?: () => Promise<void>,
  onRemove?: () => Promise<void>,
};

const GroupMemberListItem = ({
  user,
  groupMembership,
  onRemove,
  onAdd,
}: Props) => {
  return (
    <ListItem
      title={user.name}
      subtitle={
        <>
          {user.lastActiveAt ? (
            <>
              Active <Time dateTime={user.lastActiveAt} /> ago
            </>
          ) : (
            "Never signed in"
          )}
          {!user.lastActiveAt && <Badge>Invited</Badge>}
          {user.isAdmin && <Badge primary={user.isAdmin}>Admin</Badge>}
        </>
      }
      image={<Avatar src={user.avatarUrl} size={40} />}
      actions={
        <Flex align="center">
          {onRemove && (
            <DropdownMenu>
              <DropdownMenuItem onClick={onRemove}>Remove</DropdownMenuItem>
            </DropdownMenu>
          )}
          {onAdd && (
            <Button onClick={onAdd} neutral>
              Add
            </Button>
          )}
        </Flex>
      }
    />
  );
};

export default GroupMemberListItem;
