import {
  useFocusEffect,
  useRovingTabIndex,
} from "@getoutline/react-roving-tabindex";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { Link } from "react-router-dom";
import { CheckmarkIcon, DocumentIcon } from "outline-icons";
import styled, { css, useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "@shared/components/EventBoundary";
import Icon from "@shared/components/Icon";
import { s, hover } from "@shared/styles";
import type Note from "~/models/Note";
import Badge from "~/components/Badge";
import { useModelSelection } from "~/components/ModelSelectionContext";
import NoteMeta from "~/components/NoteMeta";
import Flex from "~/components/Flex";
import Highlight from "~/components/Highlight";
import NudeButton from "~/components/NudeButton";
import StarButton, { AnimatedStar } from "~/components/Star";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import NoteMenu from "~/menus/NoteMenu";
import { notePath } from "~/utils/routeHelpers";
import { determineSidebarContext } from "./Sidebar/components/SidebarContext";
import { useDragNote } from "./Sidebar/hooks/useDragAndDrop";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useNoteMenuAction } from "~/hooks/useNoteMenuAction";
import { ContextMenu } from "./Menu/ContextMenu";
import useStores from "~/hooks/useStores";
type Props = {
  note: Note;
  highlight?: string | undefined;
  context?: string | undefined;
  showParentNotes?: boolean;
  showNotebook?: boolean;
  showPublished?: boolean;
  showDraft?: boolean;
};
const SEARCH_RESULT_REGEX = /<b\b[^>]*>(.*?)<\/b>/gi;
function replaceResultMarks(tag: string) {
  // don't use SEARCH_RESULT_REGEX directly here as it causes an infinite loop
  return tag.replace(new RegExp(SEARCH_RESULT_REGEX.source), "$1");
}
function NoteListItem(props: Props, ref: React.RefObject<HTMLAnchorElement>) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const theme = useTheme();
  const { userMemberships, groupMemberships } = useStores();
  const locationSidebarContext = useLocationSidebarContext();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const isMobile = useMobile();
  const selection = useModelSelection();
  const iconRef = React.useRef<HTMLDivElement>(null);
  let itemRef: React.Ref<HTMLAnchorElement> =
    React.useRef<HTMLAnchorElement>(null);
  if (ref) {
    itemRef = ref;
  }
  const { focused, ...rovingTabIndex } = useRovingTabIndex(itemRef, false);
  useFocusEffect(focused, itemRef);
  const {
    note,
    showParentNotes,
    showNotebook,
    showPublished,
    showDraft = true,
    highlight,
    context,
    ...rest
  } = props;
  const queryIsInTitle =
    !!highlight && !!note.title.toLowerCase().includes(highlight.toLowerCase());
  const canStar = !note.isArchived;
  // Multi-select is only offered for notes the user can update.
  const can = usePolicy(note.id);
  const selectable = !!selection && !!can.update;
  const isSelected = selection?.isSelected(note.id) ?? false;
  const isSelecting =
    selectable && ((selection?.isActive ?? false) || isSelected);
  const inSelectArea = (event: React.MouseEvent) =>
    selectable && !!iconRef.current?.contains(event.target as Node);
  // Handled on the link so preventDefault reliably suppresses navigation.
  const handleLinkClick = (event: React.MouseEvent) => {
    if (selection && inSelectArea(event)) {
      event.preventDefault();
      if (event.shiftKey) {
        selection.selectRange(note.id);
      } else {
        selection.toggle(note.id);
      }
      return;
    }
    rovingTabIndex.onClick?.(event);
  };
  // Suppress the browser's text selection when shift-clicking to select a range.
  const handleLinkMouseDown = (event: React.MouseEvent) => {
    if (event.shiftKey && inSelectArea(event)) {
      event.preventDefault();
    }
  };
  const isShared = !!(
    userMemberships.getByNoteId(note.id) ||
    groupMemberships.getByNoteId(note.id)
  );
  const sidebarContext = determineSidebarContext({
    note: note,
    user,
    currentContext: locationSidebarContext,
  });
  const contextMenuAction = useNoteMenuAction({ noteId: note.id });
  const [{ isDragging }, draggableRef] = useDragNote(
    note.asNavigationNode,
    0,
    note,
    false,
    false
  );
  const mergedRef = React.useMemo(
    () =>
      mergeRefs<HTMLAnchorElement>([
        itemRef,
        draggableRef,
      ] as React.Ref<HTMLAnchorElement>[]),
    [itemRef, draggableRef]
  );
  return (
    <ActionContextProvider
      value={{
        activeModels: [
          note,
          ...(!isShared && note.notebook ? [note.notebook] : []),
        ],
      }}
    >
      <ContextMenu
        action={contextMenuAction}
        ariaLabel={t("Document options")}
        onOpen={handleMenuOpen}
        onClose={handleMenuClose}
      >
        <NoteLink
          ref={mergedRef}
          dir={note.dir}
          $isStarred={note.isStarred}
          $isDragging={isDragging}
          $menuOpen={menuOpen}
          $selectable={selectable}
          to={{
            pathname: notePath(note),
            search: highlight
              ? `?q=${encodeURIComponent(highlight)}`
              : undefined,
            state: {
              title: note.titleWithDefault,
              sidebarContext,
            },
          }}
          {...rest}
          {...rovingTabIndex}
          onClick={handleLinkClick}
          onMouseDown={handleLinkMouseDown}
        >
          <Flex gap={4} auto>
            <IconWrapper ref={iconRef}>
              {selectable && (
                <SelectButton
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={t("Select")}
                  $checked={isSelected}
                  $visible={isSelecting}
                  tabIndex={-1}
                >
                  {isSelected && <CheckmarkIcon size={16} />}
                </SelectButton>
              )}
              <NoteIconWrapper $dimmed={isSelecting}>
                {note.icon ? (
                  <Icon
                    value={note.icon}
                    color={note.color ?? undefined}
                    initial={note.initial}
                  />
                ) : (
                  <DocumentIcon
                    outline={note.isDraft}
                    color={theme.textSecondary}
                  />
                )}
              </NoteIconWrapper>
            </IconWrapper>
            <Content>
              <Heading dir={note.dir}>
                <Title
                  text={note.titleWithDefault}
                  highlight={highlight}
                  dir={note.dir}
                />
                {note.isBadgedNew && note.createdBy?.id !== user.id && (
                  <Badge yellow>{t("New")}</Badge>
                )}
                {note.isDraft && showDraft && (
                  <Tooltip content={t("Only visible to you")} placement="top">
                    <Badge>{t("Draft")}</Badge>
                  </Tooltip>
                )}
                {canStar && !isMobile && <StarButton note={note} />}
              </Heading>

              {!queryIsInTitle && (
                <ResultContext
                  text={context}
                  highlight={highlight ? SEARCH_RESULT_REGEX : undefined}
                  processResult={replaceResultMarks}
                />
              )}
              <NoteMeta
                note={note}
                showNotebook={showNotebook}
                showPublished={showPublished}
                showParentNotes={showParentNotes}
                showLastViewed
              />
            </Content>
          </Flex>
          <Actions>
            <NoteMenu
              note={note}
              onOpen={handleMenuOpen}
              onClose={handleMenuClose}
            />
          </Actions>
        </NoteLink>
      </ContextMenu>
    </ActionContextProvider>
  );
}
const IconWrapper = styled.div`
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 24px;
  /* Hug the icon rather than stretching to the height of the item, so that only
  clicks landing on the icon itself begin a selection – the remainder of the
  item navigates. */
  align-self: flex-start;
`;
const NoteIconWrapper = styled.span<{
  $dimmed: boolean;
}>`
  display: flex;
  transition: opacity 100ms ease;
  opacity: ${(props) => (props.$dimmed ? 0 : 1)};
`;
const SelectButton = styled(NudeButton)<{
  $checked: boolean;
  $visible: boolean;
}>`
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 2px solid ${s("inputBorder")};
  color: ${(props) => props.theme.accentText};
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition:
    opacity 100ms ease,
    background 100ms ease,
    border-color 100ms ease;

  ${(props) =>
    props.$checked &&
    css`
      background: ${props.theme.accent};
      border-color: ${props.theme.accent};
    `}
`;
const Content = styled.div`
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 0;
`;
const Actions = styled(EventBoundary)`
  display: none;
  align-items: center;
  margin: 8px;
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
  $isStarred?: boolean;
  $isDragging?: boolean;
  $menuOpen?: boolean;
  $selectable?: boolean;
}>`
  display: flex;
  align-items: center;
  margin: 10px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  width: calc(100vw - 8px);
  cursor: var(--pointer);
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};

  &:focus-visible {
    outline: none;
  }

  ${breakpoint("tablet")`
    width: auto;
  `};

  ${Actions} {
    opacity: 0;
  }

  ${AnimatedStar} {
    opacity: ${(props) => (props.$isStarred ? "1 !important" : 0)};
  }

  &:${hover},
  &:active,
  &:focus,
  &:focus-within {
    background: ${s("listItemHoverBackground")};

    ${Actions} {
      opacity: 1;
    }

    ${AnimatedStar} {
      opacity: 0.5;

      &:${hover} {
        opacity: 1;
      }
    }
  }

  /* Revealing the checkbox is a hover affordance only – on touch devices the
  equivalent states (active, focus) are triggered by tapping the item to
  navigate, which makes an item appear selected when it is not. There, the
  checkbox appears once a selection is underway. */
  @media (hover: hover) {
    &:hover,
    &:focus,
    &:focus-within {
      ${(props) =>
        props.$selectable &&
        css`
          ${SelectButton} {
            opacity: 1;
          }

          ${NoteIconWrapper} {
            opacity: 0;
          }
        `}
    }
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${s("listItemHoverBackground")};

      ${Actions} {
        opacity: 1;
      }

      ${AnimatedStar} {
        opacity: 0.5;
      }
    `}
`;
const Heading = styled.span<{
  rtl?: boolean;
}>`
  display: flex;
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
  align-items: center;
  margin-top: 0;
  margin-bottom: 0.1em;
  white-space: nowrap;
  color: ${s("text")};
  font-family: ${s("fontFamily")};
  font-weight: 500;
  font-size: 18px;
  line-height: 1.2;
  gap: 4px;
`;
const Title = styled(Highlight)`
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const ResultContext = styled(Highlight)`
  display: block;
  color: ${s("textSecondary")};
  font-size: 15px;
  margin-top: -0.25em;
  margin-bottom: 0.25em;
  max-height: 90px;
  overflow: hidden;
`;
export default observer(React.forwardRef(NoteListItem));
