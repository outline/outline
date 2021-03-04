// @flow
import * as React from "react";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Button from "components/Button";
import Flex from "components/Flex";
import ListItem from "components/List/Item";
import Time from "components/Time";
import GroupMemberMenu from "menus/GroupMemberMenu";

type Props = {|
  user: User,
  onAdd?: () => Promise<void>,
  onRemove?: () => Promise<void>,
|};

const GroupMemberListItem = ({ user, onRemove, onAdd }: Props) => {
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
          {user.isInvited && <Badge>Invited</Badge>}
          {user.isAdmin && <Badge primary={user.isAdmin}>Admin</Badge>}
        </>
      }
      image={<Avatar src={user.avatarUrl} size={40} />}
      actions={
        <Flex align="center">
          {onRemove && <GroupMemberMenu onRemove={onRemove} />}
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
