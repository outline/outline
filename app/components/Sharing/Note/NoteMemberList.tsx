import { orderBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import { NotePermission } from "@shared/types";
import type Note from "~/models/Note";
import type UserMembership from "~/models/UserMembership";
import { GroupAvatar } from "~/components/Avatar";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type { Permission } from "~/types";
import { EmptySelectValue } from "~/types";
import { homePath } from "~/utils/routeHelpers";
import { ListItem } from "../components/ListItem";
import { GroupMembersPopover } from "../components";
import NoteMemberListItem from "./NoteMemberListItem";
import ButtonLink from "~/components/ButtonLink";
type Props = {
  /** Document to which team members are supposed to be invited */
  note: Note;
  /** Children to be rendered before the list of members */
  children?: React.ReactNode;
  /** List of users that have been invited during the current editing session */
  invitedInSession: string[];
};
function NoteMemberList({ note, invitedInSession }: Props) {
  const { userMemberships, groupMemberships } = useStores();
  const user = useCurrentUser();
  const history = useHistory();
  const can = usePolicy(note);
  const { t } = useTranslation();
  const theme = useTheme();
  const handleRemoveUser = React.useCallback(
    async (item) => {
      try {
        await userMemberships.delete({
          noteId: note.id,
          userId: item.id,
        } as UserMembership);
        if (item.id === user.id) {
          history.push(homePath());
        } else {
          toast.success(
            t(`{{ userName }} was removed from the document`, {
              userName: item.name,
            })
          );
        }
      } catch (_err) {
        toast.error(t("Could not remove user"));
      }
    },
    [t, history, userMemberships, user, note]
  );
  const handleUpdateUser = React.useCallback(
    async (userToUpdate, permission) => {
      try {
        await userMemberships.create({
          noteId: note.id,
          userId: userToUpdate.id,
          permission,
        });
        toast.success(
          t(`Permissions for {{ userName }} updated`, {
            userName: userToUpdate.name,
          })
        );
      } catch (_err) {
        toast.error(t("Could not update user"));
      }
    },
    [t, userMemberships, note]
  );
  // Order newly added users first during the current editing session, on reload members are
  // ordered by name
  const members = React.useMemo(
    () =>
      orderBy(
        Array.from(
          new Map(
            note.members.map((memberUser) => [memberUser.id, memberUser])
          ).values()
        ),
        (memberUser) =>
          (invitedInSession.includes(memberUser.id) ? "_" : "") +
          memberUser.name.toLocaleLowerCase(),
        "asc"
      ),
    [note.members, invitedInSession]
  );
  const permissions = React.useMemo(
    () =>
      [
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
      ] as Permission[],
    [t]
  );
  return (
    <>
      {Array.from(
        new Map(
          groupMemberships
            .inNote(note.id)
            .filter((membership) => membership.group)
            .map((membership) => [membership.group.id, membership])
        ).values()
      )
        .sort((a, b) =>
          (
            (invitedInSession.includes(a.group.id) ? "_" : "") + a.group.name
          ).localeCompare(
            (invitedInSession.includes(b.group.id) ? "_" : "") + b.group.name
          )
        )
        .map((membership) => {
          const MaybeLink = membership?.source ? StyledLink : React.Fragment;
          return (
            <ListItem
              key={membership.id}
              image={
                <GroupAvatar
                  group={membership.group}
                  backgroundColor={theme.modalBackground}
                />
              }
              title={membership.group.name}
              subtitle={
                membership.sourceId ? (
                  <Trans>
                    Has access through{" "}
                    <MaybeLink
                      // @ts-expect-error to prop does not exist on React.Fragment
                      to={membership.source?.note?.path ?? ""}
                    >
                      parent
                    </MaybeLink>
                  </Trans>
                ) : (
                  <GroupMembersPopover group={membership.group}>
                    <StyledButtonLink>
                      {t("{{ count }} member", {
                        count: membership.group.memberCount,
                      })}
                    </StyledButtonLink>
                  </GroupMembersPopover>
                )
              }
              actions={
                <div style={{ marginRight: -8 }}>
                  <InputMemberPermissionSelect
                    permissions={permissions}
                    onChange={async (
                      permission: NotePermission | typeof EmptySelectValue
                    ) => {
                      if (permission === EmptySelectValue) {
                        await groupMemberships.delete({
                          noteId: note.id,
                          groupId: membership.groupId,
                        });
                      } else {
                        await groupMemberships.create({
                          noteId: note.id,
                          groupId: membership.groupId,
                          permission,
                        });
                      }
                    }}
                    disabled={!can.manageUsers}
                    value={membership.permission}
                  />
                </div>
              }
            />
          );
        })}
      {members.map((item) => (
        <NoteMemberListItem
          key={item.id}
          user={item}
          membership={item.getMembership(note)}
          onRemove={() => handleRemoveUser(item)}
          onUpdate={
            can.manageUsers
              ? (permission) => handleUpdateUser(item, permission)
              : undefined
          }
          onLeave={
            item.id === user.id ? () => handleRemoveUser(item) : undefined
          }
        />
      ))}
    </>
  );
}
const StyledButtonLink = styled(ButtonLink)`
  color: ${s("textTertiary")};
  &:hover {
    text-decoration: underline;
  }
`;
const StyledLink = styled(Link)`
  color: ${s("textTertiary")};
  text-decoration: underline;
`;
export default observer(NoteMemberList);
