import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { CollectionPermission } from "@shared/types";
import Membership from "~/models/Membership";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Time from "~/components/Time";
import MemberMenu from "~/menus/MemberMenu";
import InputMemberPermissionSelect from "./InputMemberPermissionSelect";

type Props = {
  user: User;
  membership?: Membership | undefined;
  canEdit: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onUpdate?: (permission: CollectionPermission) => void;
};

const MemberListItem = ({
  user,
  membership,
  onRemove,
  onUpdate,
  onAdd,
  canEdit,
}: Props) => {
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
        <Flex align="center" gap={8}>
          {onUpdate && (
            <InputMemberPermissionSelect
              value={membership ? membership.permission : undefined}
              onChange={onUpdate}
              disabled={!canEdit}
            />
          )}
          {canEdit && (
            <>
              {onRemove && <MemberMenu user={user} onRemove={onRemove} />}
              {onAdd && (
                <Button onClick={onAdd} neutral>
                  {t("Add")}
                </Button>
              )}
            </>
          )}
        </Flex>
      }
    />
  );
};

export default observer(MemberListItem);
