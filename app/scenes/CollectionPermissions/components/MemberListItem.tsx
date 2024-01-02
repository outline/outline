import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { CollectionPermission } from "@shared/types";
import Membership from "~/models/Membership";
import User from "~/models/User";
import UserMembership from "~/models/UserMembership";
import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import ListItem from "~/components/List/Item";
import Time from "~/components/Time";
import MemberMenu from "~/menus/MemberMenu";

type Props = {
  user: User;
  membership?: Membership | UserMembership | undefined;
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
              permissions={[
                {
                  label: t("View only"),
                  value: CollectionPermission.Read,
                },
                {
                  label: t("Can edit"),
                  value: CollectionPermission.ReadWrite,
                },
                {
                  label: t("Admin"),
                  value: CollectionPermission.Admin,
                },
              ]}
              value={membership?.permission}
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
