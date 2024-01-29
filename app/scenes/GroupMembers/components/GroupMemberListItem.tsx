import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Time from "~/components/Time";
import GroupMemberMenu from "~/menus/GroupMemberMenu";

type Props = {
  user: User;
  onAdd?: () => Promise<void>;
  onRemove?: () => Promise<void>;
};

const GroupMemberListItem = ({ user, onRemove, onAdd }: Props) => {
  const { t } = useTranslation();

  return (
    <ListItem
      title={user.name}
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
      image={<Avatar model={user} size={32} />}
      actions={
        <Flex align="center">
          {onRemove && <GroupMemberMenu onRemove={onRemove} />}
          {onAdd && (
            <Button onClick={onAdd} neutral>
              {t("Add")}
            </Button>
          )}
        </Flex>
      }
    />
  );
};

export default observer(GroupMemberListItem);
