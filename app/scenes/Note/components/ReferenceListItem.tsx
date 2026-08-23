import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "@shared/components/EventBoundary";
import Icon from "@shared/components/Icon";
import { s, hover, ellipsis } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import useShare from "@shared/hooks/useShare";
import Note from "~/models/Note";
import Flex from "~/components/Flex";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import NudeButton from "~/components/NudeButton";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useNoteMenuAction } from "~/hooks/useNoteMenuAction";
import NoteMenu from "~/menus/NoteMenu";
import { sharedModelPath } from "~/utils/routeHelpers";
import useBoolean from "~/hooks/useBoolean";
import useClickIntent from "~/hooks/useClickIntent";
import useStores from "~/hooks/useStores";
import { useCallback } from "react";
import useCurrentUser from "~/hooks/useCurrentUser";
type Props = {
  note: Note | NavigationNode;
  anchor?: string;
  showNotebook?: boolean;
  sidebarContext?: SidebarContextType;
};
const Actions = styled(EventBoundary)`
  display: none;
  align-items: center;
  flex-shrink: 0;
  flex-grow: 0;
  color: ${s("textSecondary")};

  ${NudeButton}:${hover},
  ${NudeButton}[aria-expanded= "true"] {
    background: ${s("sidebarControlHoverBackground")};
  }

  ${breakpoint("tablet")`
    display: flex;
  `};
`;
const NoteLink = styled(Link)<{
  $menuOpen?: boolean;
}>`
  display: flex;
  align-items: center;
  margin: 2px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  min-width: 100%;
  overflow: hidden;
  position: relative;
  cursor: var(--pointer);

  ${Actions} {
    opacity: 0;
  }

  &:${hover},
  &:active,
  &:focus,
  &:focus-within {
    background: ${s("listItemHoverBackground")};

    ${Actions} {
      opacity: 1;
    }
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${s("listItemHoverBackground")};

      ${Actions} {
        opacity: 1;
      }
    `}
`;
const Content = styled(Flex)`
  flex-grow: 1;
  min-width: 0;
  color: ${s("textSecondary")};
  margin-left: -4px;
`;
const Title = styled.div`
  ${ellipsis()}
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
  padding-top: 3px;
  color: ${s("text")};
  font-family: ${s("fontFamily")};
`;
function ReferenceListItem({
  note,
  showNotebook,
  anchor,
  sidebarContext,
  ...rest
}: Props) {
  const { notes } = useStores();
  const { shareId } = useShare();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const prefetchNote = useCallback(async () => {
    await notes.prefetchNote(note.id);
  }, [notes, note.id]);
  const { handleMouseEnter, handleMouseLeave } = useClickIntent(prefetchNote);
  const { icon, color } = note;
  const isEmoji = determineIconType(icon) === IconType.Emoji;
  const title = note instanceof Note ? note.titleWithDefault : note.title;
  const initial = title.charAt(0).toUpperCase();
  const showContextMenu = note instanceof Note && !!user;
  const link = (
    <NoteLink
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      $menuOpen={menuOpen}
      to={{
        pathname: shareId ? sharedModelPath(shareId, note.url) : note.url,
        hash: anchor ? `d-${anchor}` : undefined,
        state: {
          title: note.title,
          sidebarContext,
        },
      }}
      {...rest}
    >
      <Content gap={4} dir="auto">
        {icon ? (
          <Icon value={icon} color={color ?? undefined} initial={initial} />
        ) : (
          <DocumentIcon />
        )}
        <Title>{isEmoji ? title.replace(icon!, "") : title}</Title>
      </Content>
      {showContextMenu && (
        <Actions>
          <NoteMenu
            note={note}
            onOpen={handleMenuOpen}
            onClose={handleMenuClose}
          />
        </Actions>
      )}
    </NoteLink>
  );
  if (!showContextMenu) {
    return <li>{link}</li>;
  }
  return (
    <li>
      <ReferenceListItemContextMenu
        note={note}
        handleMenuOpen={handleMenuOpen}
        handleMenuClose={handleMenuClose}
      >
        {link}
      </ReferenceListItemContextMenu>
    </li>
  );
}
const ReferenceListItemContextMenu = observer(
  function ReferenceListItemContextMenu_({
    note,
    children,
    handleMenuOpen,
    handleMenuClose,
  }: {
    note: Note;
    handleMenuOpen: () => void;
    handleMenuClose: () => void;
    children: React.ReactNode;
  }) {
    const { t } = useTranslation();
    const { isShare } = useShare();
    const contextMenuAction = useNoteMenuAction({
      noteId: note.id,
    });
    return (
      <ActionContextProvider
        value={{
          activeModels: [
            note,
            ...(!isShare && note.notebook ? [note.notebook] : []),
          ],
        }}
      >
        <ContextMenu
          action={contextMenuAction}
          ariaLabel={t("Document options")}
          onOpen={handleMenuOpen}
          onClose={handleMenuClose}
        >
          {children}
        </ContextMenu>
      </ActionContextProvider>
    );
  }
);
export default observer(ReferenceListItem);
