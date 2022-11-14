import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import ListItem from "~/components/List/Item";
import Time from "~/components/Time";

type Props = {
  user: User;
  canEdit: boolean;
  onAdd: () => void;
};

const UserListItem = ({ user, onAdd, canEdit }: Props) => {
  const { t } = useTranslation();

  return (
    <ListItem
      title={user.name}
      image={<Avatar model={user} size={32} />}
      subtitle={
        <>
          {user.lastActiveAt ? (
            <Trans>
              Active <Time dateTime={user.lastActiveAt} /> ago
            </Trans>
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

export default observer(UserListItem);
