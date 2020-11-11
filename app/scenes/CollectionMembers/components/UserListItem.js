// @flow
import i18n from "i18next";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Button from "components/Button";
import ListItem from "components/List/Item";
import Time from "components/Time";

const t = (k) => i18n.t(k);

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
              {t("Active {{ lastActiveAt }} ago", {
                lastActiveAt: <Time dateTime={user.lastActiveAt} />,
              })}
            </>
          ) : (
            t("Never signed in")
          )}
          {user.isInvited && <Badge>{t("Invited")}</Badge>}
          {user.isAdmin && <Badge primary={user.isAdmin}>{t("Admin")}</Badge>}
        </>
      }
      actions={
        canEdit ? (
          <Button type="button" onClick={onAdd} icon={<PlusIcon />} neutral>
            {t("Add")}
          </Button>
        ) : undefined
      }
    />
  );
};

export default UserListItem;
