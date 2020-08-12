// @flow
import { PlusIcon } from "outline-icons";
import * as React from "react";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Button from "components/Button";
import ListItem from "components/List/Item";
import Time from "components/Time";

type Props = {
  user: User,
  canEdit: boolean,
  onAdd: () => void,
};

const UserListItem = ({ user, onAdd, canEdit }: Props) => {
  return (
    <ListItem
      title={user.name}
      image={<Avatar src={user.avatarUrl} size={40} />}
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
      actions={
        canEdit ? (
          <Button type="button" onClick={onAdd} icon={<PlusIcon />} neutral>
            Add
          </Button>
        ) : undefined
      }
    />
  );
};

export default UserListItem;
