import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { DocumentPermission } from "@shared/types";
import Membership from "~/models/Membership";
import User from "~/models/User";
import UserMembership from "~/models/UserMembership";
import Avatar from "~/components/Avatar";
import { AvatarSize } from "~/components/Avatar/Avatar";
import Flex from "~/components/Flex";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import ListItem from "~/components/List/Item";
import { EmptySelectValue } from "~/types";

type Props = {
  user: User;
  membership?: Membership | UserMembership | undefined;
  canEdit: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onUpdate?: (permission: DocumentPermission) => void;
};

const MemberListItem = ({
  user,
  membership,
  onRemove,
  onUpdate,
  canEdit,
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

  return (
    <ListItem
      title={user.name}
      image={<Avatar model={user} size={AvatarSize.Medium} />}
      border={false}
      style={{ marginRight: -8 }}
      actions={
        <Flex align="center" gap={8}>
          {onUpdate && (
            <InputMemberPermissionSelect
              permissions={[
                {
                  label: t("No access"),
                  value: EmptySelectValue,
                },
                {
                  label: t("View only"),
                  value: DocumentPermission.Read,
                },
                {
                  label: t("View and edit"),
                  value: DocumentPermission.ReadWrite,
                },
              ]}
              value={membership?.permission}
              onChange={handleChange}
              disabled={!canEdit}
            />
          )}
        </Flex>
      }
    />
  );
};

export default observer(MemberListItem);
