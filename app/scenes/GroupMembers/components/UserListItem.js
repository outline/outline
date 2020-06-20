// @flow
import * as React from "react";
import { PlusIcon } from "outline-icons";
import Time from "shared/components/Time";
import Avatar from "components/Avatar";
import Button from "components/Button";
import Badge from "components/Badge";
import ListItem from "components/List/Item";
import User from "models/User";

type Props = {
  user: User,
  canEdit: boolean,
  onAdd: () => void,
};

const UserListItem = ({ user, onAdd, canEdit }: Props) => {
  return (
    <ListItem
      title={user.name}
      image={<Avatar src={user.avatarUrl} size={32} />}
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
      actions={
        canEdit ? (
          <Button type="button" onClick={onAdd} icon={<PlusIcon />} neutral>
            Add
          </Button>
        ) : (
          undefined
        )
      }
    />
  );
};

export default UserListItem;
