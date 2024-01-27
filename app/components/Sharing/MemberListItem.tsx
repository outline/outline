import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { DocumentPermission } from "@shared/types";
import User from "~/models/User";
import UserMembership from "~/models/UserMembership";
import Avatar from "~/components/Avatar";
import { AvatarSize } from "~/components/Avatar/Avatar";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import ListItem from "~/components/List/Item";
import { EmptySelectValue, Permission } from "~/types";

type Props = {
  user: User;
  membership?: UserMembership | undefined;
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
    <StyledListItem
      title={user.name}
      image={
        <Avatar model={user} size={AvatarSize.Medium} showBorder={false} />
      }
      subtitle={
        membership?.sourceId
          ? t("Has access through parent")
          : user.isSuspended
          ? t("Suspended")
          : user.isInvited
          ? t("Invited")
          : user.isViewer
          ? t("Viewer")
          : user.email
          ? user.email
          : t("Member")
      }
      border={false}
      actions={
        disabled ? null : (
          <div style={{ marginRight: -8 }}>
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
            />
          </div>
        )
      }
      small
    />
  );
};

export const StyledListItem = styled(ListItem)`
  margin: 0 -16px;
  padding: 6px 16px;
  border-radius: 8px;
`;

export default observer(MemberListItem);
