import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { DocumentPermission } from "@shared/types";
import Membership from "~/models/Membership";
import User from "~/models/User";
import UserMembership from "~/models/UserMembership";
import Avatar from "~/components/Avatar";
import { AvatarSize } from "~/components/Avatar/Avatar";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import ListItem from "~/components/List/Item";
import { EmptySelectValue, Permission } from "~/types";

type Props = {
  user: User;
  membership?: Membership | UserMembership | undefined;
  onAdd?: () => void;
  onRemove?: () => void;
  onLeave?: () => void;
  onUpdate?: (permission: DocumentPermission) => void;
};

const MemberListItem = ({
  user,
  membership,
  onRemove,
  onLeave,
  onUpdate,
}: Props) => {
  const { t } = useTranslation();

  const handleChange = React.useCallback(
    (permission: DocumentPermission | typeof EmptySelectValue) => {
      if (permission === EmptySelectValue) {
        onRemove?.();
      } else {
        onUpdate?.(permission);
      }
    },
    [onRemove, onUpdate]
  );

  const permissions: Permission[] = [
    {
      label: t("View only"),
      value: DocumentPermission.Read,
    },
    {
      label: t("Can edit"),
      value: DocumentPermission.ReadWrite,
    },
    {
      label: t("No access"),
      value: EmptySelectValue,
    },
  ];

  const currentPermission = permissions.find(
    (p) => p.value === membership?.permission
  );
  if (!currentPermission) {
    return null;
  }
  const disabled = !onUpdate && !onLeave;

  return (
    <ListItem
      title={user.name}
      image={<Avatar model={user} size={AvatarSize.Medium} />}
      border={false}
      style={{ marginRight: -8 }}
      small
      actions={
        <InputMemberPermissionSelect
          permissions={
            onLeave
              ? [
                  currentPermission,
                  {
                    label: `${t("Leave")}…`,
                    value: EmptySelectValue,
                  },
                ]
              : permissions
          }
          value={membership?.permission}
          onChange={handleChange}
          disabled={disabled}
        />
      }
    />
  );
};

export default observer(MemberListItem);
