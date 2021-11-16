import { PlusIcon } from "outline-icons";
import * as React from "react";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Button from "components/Button";
import ListItem from "components/List/Item";
import Time from "components/Time";

type Props = {
  user: User;
  canEdit: boolean;
  onAdd: () => void;
};

const UserListItem = ({ user, onAdd, canEdit }: Props) => {
  return (
    <ListItem
      title={user.name}
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ title: string; image: Element; subtitle: E... Remove this comment to see the full error message
      image={<Avatar src={user.avatarUrl} size={32} />}
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
          // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this
          call.
          {user.isAdmin && <Badge primary={user.isAdmin}>Admin</Badge>}
        </>
      }
      actions={
        canEdit ? (
          // @ts-expect-error ts-migrate(2747) FIXME: 'Button' components don't accept text as child ele... Remove this comment to see the full error message
          <Button type="button" onClick={onAdd} icon={<PlusIcon />} neutral>
            Add
          </Button>
        ) : undefined
      }
    />
  );
};

export default UserListItem;
