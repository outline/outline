import { observer } from "mobx-react";
import { MoreIcon, QuestionMarkIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { s } from "@shared/styles";
import { NotebookPermission, IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import type Share from "~/models/Share";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMaxHeight from "~/hooks/useMaxHeight";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { Avatar, AvatarSize } from "../../Avatar";
import CollectionIcon from "../../Icons/NotebookIcon";
import Tooltip from "../../Tooltip";
import { Separator } from "../components";
import { ListItem } from "../components/ListItem";
import { Placeholder } from "../components/Placeholder";
import NoteMemberList from "./NoteMemberList";
import PublicAccess from "./PublicAccess";
type Props = {
  /** The document being shared. */
  note: Note;
  /** List of users that have been invited during the current editing session */
  invitedInSession: string[];
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** The existing share parent model, if any. */
  sharedParent: Share | null | undefined;
  /** Callback fired when the popover requests to be closed. */
  onRequestClose: () => void;
  /** Whether the popover is visible. */
  visible: boolean;
  /** Whether the share data is currently loading. */
  loading: boolean;
};
export const AccessControlList = observer(
  ({
    note,
    invitedInSession,
    share,
    sharedParent,
    onRequestClose,
    visible,
    loading,
  }: Props) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const notebook = note.notebook;
    const usersInNotebook = useUsersInNotebook(notebook);
    const user = useCurrentUser();
    const { groupMemberships } = useStores();
    const notebookSharingDisabled = note.notebook?.sharing === false;
    const team = useCurrentTeam();
    const can = usePolicy(note);
    const canNotebook = usePolicy(notebook);
    const noteId = note.id;
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const publicAccessRef = React.useRef<HTMLDivElement | null>(null);
    const publicAccessHeight = publicAccessRef.current?.clientHeight || 0;
    const { maxHeight, calcMaxHeight } = useMaxHeight({
      elementRef: containerRef,
      maxViewportPercentage: 45,
      margin: 24,
    });
    const hasMemberships =
      groupMemberships.inNote(noteId)?.length > 0 || note.members.length > 0;
    const showLoading = !hasMemberships && loading;
    React.useEffect(() => {
      calcMaxHeight();
    });
    return (
      <Wrapper>
        <ScrollableContainer
          ref={containerRef}
          hiddenScrollbars
          style={{
            maxHeight: maxHeight ? maxHeight - publicAccessHeight : undefined,
          }}
        >
          {note.isDraft ? (
            <>
              <ListItem
                image={<Avatar model={note.createdBy} />}
                title={note.createdBy?.name}
                actions={
                  <AccessTooltip content={t("Created the document")}>
                    {t("Can edit")}
                  </AccessTooltip>
                }
              />
              {showLoading ? (
                <Placeholder />
              ) : (
                <NoteMemberList
                  note={note}
                  invitedInSession={invitedInSession}
                />
              )}
            </>
          ) : notebook && canNotebook.readNote ? (
            <>
              {notebook.permission ? (
                <ListItem
                  image={
                    <Squircle color={theme.accent} size={AvatarSize.Medium}>
                      <UserIcon color={theme.accentText} size={16} />
                    </Squircle>
                  }
                  title={t("All members")}
                  subtitle={t("Everyone in the workspace")}
                  actions={
                    <AccessTooltip>
                      {notebook?.permission === NotebookPermission.ReadWrite
                        ? t("Can edit")
                        : t("Can view")}
                    </AccessTooltip>
                  }
                />
              ) : usersInNotebook ? (
                <ListItem
                  image={<NotebookSquircle notebook={notebook} />}
                  title={notebook.name}
                  subtitle={t("Everyone in the notebook")}
                  actions={<AccessTooltip>{t("Can view")}</AccessTooltip>}
                />
              ) : (
                <ListItem
                  image={<Avatar model={user} />}
                  title={user.name}
                  subtitle={t("You have full access")}
                  actions={<AccessTooltip>{t("Can edit")}</AccessTooltip>}
                />
              )}
              {showLoading ? (
                <Placeholder />
              ) : (
                <NoteMemberList
                  note={note}
                  invitedInSession={invitedInSession}
                />
              )}
            </>
          ) : (
            <>
              {showLoading ? (
                <Placeholder />
              ) : (
                <NoteMemberList
                  note={note}
                  invitedInSession={invitedInSession}
                />
              )}
              <ListItem
                image={
                  <Squircle color={theme.accent} size={AvatarSize.Medium}>
                    <MoreIcon color={theme.accentText} size={16} />
                  </Squircle>
                }
                title={t("Other people")}
                subtitle={t("Other workspace members may have access")}
                actions={
                  <AccessTooltip
                    content={t(
                      "This document may be shared with more workspace members through a parent document or notebook you do not have access to"
                    )}
                  />
                }
              />
            </>
          )}
        </ScrollableContainer>
        {team.sharing && can.share && !notebookSharingDisabled && visible && (
          <Sticky>
            {note.members.length ? <Separator /> : null}
            <PublicAccess
              ref={publicAccessRef}
              note={note}
              share={share}
              sharedParent={sharedParent}
              onRequestClose={onRequestClose}
            />
          </Sticky>
        )}
      </Wrapper>
    );
  }
);
const AccessTooltip = ({
  children,
  content,
}: {
  children?: React.ReactNode;
  content?: string;
}) => {
  const { t } = useTranslation();
  return (
    <Flex align="center" gap={2}>
      <Text type="secondary" size="small">
        {children}
      </Text>
      <Tooltip content={content ?? t("Access inherited from notebook")}>
        <NudeButton size={18}>
          <QuestionMarkIcon size={18} />
        </NudeButton>
      </Tooltip>
    </Flex>
  );
};
const NotebookSquircle = ({ notebook }: { notebook: Notebook }) => {
  const theme = useTheme();
  const iconType = determineIconType(notebook.icon)!;
  const squircleColor =
    iconType === IconType.SVG ? notebook.color! : theme.slateLight;
  const iconSize = iconType === IconType.SVG ? 16 : 22;
  return (
    <Squircle color={squircleColor} size={AvatarSize.Medium}>
      <CollectionIcon notebook={notebook} color={theme.white} size={iconSize} />
    </Squircle>
  );
};
function useUsersInNotebook(notebook?: Notebook) {
  const { users, memberships } = useStores();
  const fetchMemberships = React.useCallback(
    () => memberships.fetchPage({ limit: 1, id: notebook!.id }),
    [memberships, notebook]
  );
  const { request } = useRequest(fetchMemberships);
  React.useEffect(() => {
    if (notebook && !notebook.permission) {
      void request();
    }
  }, [notebook, request]);
  return notebook
    ? notebook.permission
      ? true
      : users.inNotebook(notebook.id).length > 1
    : false;
}
const Wrapper = styled(Flex)`
  flex-direction: column;
`;
const Sticky = styled.div`
  background: ${s("menuBackground")};
  position: sticky;
  bottom: 0;
`;
const ScrollableContainer = styled(Scrollable)`
  padding: 12px 24px;
  margin: -12px -24px;
`;
