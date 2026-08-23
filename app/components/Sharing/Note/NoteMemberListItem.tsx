import { observer } from "mobx-react";
import { useCallback, Fragment } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { NotePermission } from "@shared/types";
import type User from "~/models/User";
import type UserMembership from "~/models/UserMembership";
import { Avatar, AvatarSize } from "~/components/Avatar";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import Time from "~/components/Time";
import type { Permission } from "~/types";
import { EmptySelectValue } from "~/types";
import { ListItem } from "../components/ListItem";
type Props = {
  user: User;
  membership?: UserMembership | undefined;
  onAdd?: () => void;
  onRemove?: () => void;
  onLeave?: () => void;
  onUpdate?: (permission: NotePermission) => void;
};
const NoteMemberListItem = ({
  user,
  membership,
  onRemove,
  onLeave,
  onUpdate,
}: Props) => {
  const { t } = useTranslation();
  const handleChange = useCallback(
    (permission: NotePermission | typeof EmptySelectValue) => {
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
      value: NotePermission.Read,
    },
    {
      label: t("Can edit"),
      value: NotePermission.ReadWrite,
    },
    {
      label: t("Manage"),
      value: NotePermission.Admin,
    },
    {
      divider: true,
      label: t("Remove"),
      value: EmptySelectValue,
    },
  ];
  const currentPermission = permissions.find(
    (p) => p.value === membership?.permission
  );
  if (!currentPermission) {
    return null;
  }
  const MaybeLink = membership?.source ? StyledLink : Fragment;
  return (
    <ListItem
      title={user.name}
      image={<Avatar model={user} size={AvatarSize.Medium} />}
      subtitle={
        membership?.sourceId ? (
          <Trans>
            Has access through{" "}
            <MaybeLink
              // @ts-expect-error to prop does not exist on React.Fragment
              to={membership.source?.note?.path ?? ""}
            >
              parent
            </MaybeLink>
          </Trans>
        ) : user.isSuspended ? (
          t("Suspended")
        ) : user.isInvited ? (
          t("Invited")
        ) : user.lastActiveAt ? (
          <Trans>
            Active <Time dateTime={user.lastActiveAt} /> ago
          </Trans>
        ) : (
          t("Never signed in")
        )
      }
      actions={
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
            disabled={!onUpdate && !onLeave}
          />
        </div>
      }
    />
  );
};
const StyledLink = styled(Link)`
  color: ${s("textTertiary")};
  text-decoration: underline;
`;
export default observer(NoteMemberListItem);
