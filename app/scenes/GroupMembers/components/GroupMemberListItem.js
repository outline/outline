// @flow
import * as React from "react";
import Avatar from "components/Avatar";
import Flex from "shared/components/Flex";
import Time from "shared/components/Time";
import Badge from "components/Badge";
import Button from "components/Button";
import ListItem from "components/List/Item";
import User from "models/User";
import GroupMembership from "models/GroupMembership";
import { DropdownMenu, DropdownMenuItem } from "components/DropdownMenu";

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
        <React.Fragment>
          {user.lastActiveAt ? (
            <React.Fragment>
              Active <Time dateTime={user.lastActiveAt} /> ago
            </React.Fragment>
          ) : (
            "Never signed in"
          )}
          {!user.lastActiveAt && <Badge>Invited</Badge>}
          {user.isAdmin && <Badge admin={user.isAdmin}>Admin</Badge>}
        </React.Fragment>
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
