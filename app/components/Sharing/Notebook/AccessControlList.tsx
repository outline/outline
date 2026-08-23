import { observer } from "mobx-react";
import { UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import { errToString } from "@shared/utils/error";
import Squircle from "@shared/components/Squircle";
import { s } from "@shared/styles";
import { NotebookPermission } from "@shared/types";
import type Notebook from "~/models/Notebook";
import type Share from "~/models/Share";
import { Avatar, GroupAvatar, AvatarSize } from "~/components/Avatar";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import { InputSelectPermission } from "~/components/InputSelectPermission";
import Scrollable from "~/components/Scrollable";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMaxHeight from "~/hooks/useMaxHeight";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type { Permission } from "~/types";
import { EmptySelectValue } from "~/types";
import { Separator, GroupMembersPopover } from "../components";
import { ListItem } from "../components/ListItem";
import { Placeholder } from "../components/Placeholder";
import { PublicAccess } from "./PublicAccess";
import Flex from "@shared/components/Flex";
import ButtonLink from "~/components/ButtonLink";
type Props = {
  /** Notebook to which team members are supposed to be invited */
  notebook: Notebook;
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** Children to be rendered before the list of members */
  children?: React.ReactNode;
  /** List of users and groups that have been invited during the current editing session */
  invitedInSession: string[];
  /** Whether the popover is visible. */
  visible: boolean;
  /** Whether the share data is currently loading. */
  loading: boolean;
};
export const AccessControlList = observer(
  ({ notebook, share, invitedInSession, visible, loading }: Props) => {
    const { memberships, groupMemberships } = useStores();
    const team = useCurrentTeam();
    const can = usePolicy(notebook);
    const { t } = useTranslation();
    const theme = useTheme();
    const notebookId = notebook.id;
    const groupMembershipsInNotebook = groupMemberships.inNotebook(notebookId);
    const membershipsInNotebook = memberships.inNotebook(notebookId);
    const hasMemberships =
      groupMembershipsInNotebook.length > 0 || membershipsInNotebook.length > 0;
    const showLoading = !hasMemberships && loading;
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const publicAccessRef = React.useRef<HTMLDivElement | null>(null);
    const publicAccessHeight = publicAccessRef.current?.clientHeight || 0;
    const { maxHeight, calcMaxHeight } = useMaxHeight({
      elementRef: containerRef,
      maxViewportPercentage: 70,
      margin: 24,
    });
    React.useEffect(() => {
      calcMaxHeight();
    });
    const permissions = React.useMemo(
      () =>
        [
          {
            label: t("View only"),
            value: NotebookPermission.Read,
          },
          {
            label: t("Can edit"),
            value: NotebookPermission.ReadWrite,
          },
          {
            label: t("Manage"),
            value: NotebookPermission.Admin,
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
      <Wrapper>
        <ScrollableContainer
          ref={containerRef}
          hiddenScrollbars
          style={{
            maxHeight: maxHeight ? maxHeight - publicAccessHeight : undefined,
          }}
        >
          <>
            <ListItem
              image={
                <Squircle color={theme.accent} size={AvatarSize.Medium}>
                  <UserIcon color={theme.accentText} size={16} />
                </Squircle>
              }
              title={t("All members")}
              subtitle={t("Everyone in the workspace")}
              actions={
                <div style={{ marginRight: -8 }}>
                  <InputSelectPermission
                    onChange={(
                      value: NotebookPermission | typeof EmptySelectValue
                    ) => {
                      void notebook.save({
                        permission: value === EmptySelectValue ? null : value,
                      });
                    }}
                    disabled={!can.update}
                    value={notebook?.permission}
                    labelHidden
                    nude
                    shrink
                  />
                </div>
              }
            />
            {showLoading ? (
              <Placeholder />
            ) : (
              <>
                {groupMembershipsInNotebook
                  .filter((membership) => membership.group)
                  .sort((a, b) =>
                    (
                      (invitedInSession.includes(a.group.id) ? "_" : "") +
                      a.group.name
                    ).localeCompare(b.group.name)
                  )
                  .map((membership) => (
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
                        <GroupMembersPopover group={membership.group}>
                          <StyledButtonLink>
                            {t("{{ count }} member", {
                              count: membership.group.memberCount,
                            })}
                          </StyledButtonLink>
                        </GroupMembersPopover>
                      }
                      actions={
                        <div style={{ marginRight: -8 }}>
                          <InputMemberPermissionSelect
                            permissions={permissions}
                            onChange={async (
                              permission:
                                | NotebookPermission
                                | typeof EmptySelectValue
                            ) => {
                              try {
                                if (permission === EmptySelectValue) {
                                  await groupMemberships.delete({
                                    notebookId: notebook.id,
                                    groupId: membership.groupId,
                                  });
                                } else {
                                  await groupMemberships.create({
                                    notebookId: notebook.id,
                                    groupId: membership.groupId,
                                    permission,
                                  });
                                }
                              } catch (err) {
                                toast.error(errToString(err));
                                return false;
                              }
                              return true;
                            }}
                            disabled={!can.update}
                            value={membership.permission}
                          />
                        </div>
                      }
                    />
                  ))}
                {membershipsInNotebook
                  .filter((membership) => membership.user)
                  .sort((a, b) =>
                    (
                      (invitedInSession.includes(a.user.id) ? "_" : "") +
                      a.user.name
                    ).localeCompare(b.user.name)
                  )
                  .map((membership) => (
                    <ListItem
                      key={membership.id}
                      image={
                        <Avatar
                          model={membership.user}
                          size={AvatarSize.Medium}
                        />
                      }
                      title={membership.user.name}
                      subtitle={membership.user.email}
                      actions={
                        <div style={{ marginRight: -8 }}>
                          <InputMemberPermissionSelect
                            permissions={permissions}
                            onChange={async (
                              permission:
                                | NotebookPermission
                                | typeof EmptySelectValue
                            ) => {
                              try {
                                if (permission === EmptySelectValue) {
                                  await memberships.delete({
                                    notebookId: notebook.id,
                                    userId: membership.userId,
                                  });
                                } else {
                                  await memberships.create({
                                    notebookId: notebook.id,
                                    userId: membership.userId,
                                    permission,
                                  });
                                }
                              } catch (err) {
                                toast.error(errToString(err));
                                return false;
                              }
                              return true;
                            }}
                            disabled={!can.update}
                            value={membership.permission}
                          />
                        </div>
                      }
                    />
                  ))}
              </>
            )}
          </>
        </ScrollableContainer>
        {team.sharing && can.share && notebook.sharing && visible && (
          <Sticky>
            {notebook.members.length ? <Separator /> : null}
            <PublicAccess
              ref={publicAccessRef}
              notebook={notebook}
              share={share}
            />
          </Sticky>
        )}
      </Wrapper>
    );
  }
);
const StyledButtonLink = styled(ButtonLink)`
  color: ${s("textTertiary")};
  &:hover {
    text-decoration: underline;
  }
`;
const Wrapper = styled(Flex)`
  flex-direction: column;
`;
const ScrollableContainer = styled(Scrollable)`
  padding: 12px 24px;
  margin: -12px -24px;
`;
const Sticky = styled.div`
  background: ${s("menuBackground")};
  position: sticky;
  bottom: 0;
`;
