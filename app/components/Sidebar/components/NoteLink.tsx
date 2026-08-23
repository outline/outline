import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import scrollIntoView from "scroll-into-view-if-needed";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import { NotePermission, UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { sortNavigationNodes } from "@shared/utils/notebooks";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import type GroupMembership from "~/models/GroupMembership";
import type UserMembership from "~/models/UserMembership";
import type { RefHandle } from "~/components/EditableTitle";
import { useActiveSidebarContext } from "~/hooks/useActiveSidebarContext";
import useBoolean from "~/hooks/useBoolean";
import { useComputed } from "~/hooks/useComputed";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useNoteMenuAction } from "~/hooks/useNoteMenuAction";
import useOnScreen from "~/hooks/useOnScreen";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import NoteMenu from "~/menus/NoteMenu";
import * as Scenes from "~/routes/scenes";
import { noteEditPath } from "~/utils/routeHelpers";
import {
  useDragNote,
  useDropToReorderNote,
  useDropToReparentNote,
} from "../hooks/useDragAndDrop";
import { useIsDragActive, useSidebarScrollElement } from "./DragActiveContext";
import { useSidebarExpansion } from "./SidebarExpansionContext";
import NoteRow from "./NoteRow";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import type { SidebarContextType } from "./SidebarContext";
import { useSidebarContext } from "./SidebarContext";
type Props = {
  node: NavigationNode;
  notebook?: Notebook;
  membership?: UserMembership | GroupMembership;
  activeNote: Note | null | undefined;
  prefetchNote?: (noteId: string) => Promise<Note | void>;
  isDraft?: boolean;
  depth: number;
  index: number;
  parentId?: string;
};
// Approximate rendered row height; used to reserve space for unmounted rows so
// the scroll container stays the right height and IntersectionObserver triggers
// correctly as the user scrolls.
const ROW_HEIGHT = 30;
// Pre-mount rows just outside the viewport so scrolling stays smooth and drop
// targets exist a screen ahead when a drag starts.
const ROOT_MARGIN = "300px 0px";
const NoteLink = observer(function NoteLink(props: Props) {
  const { node, notebook, activeNote } = props;
  const { notes } = useStores();
  const expansion = useSidebarExpansion();
  const expanded = expansion.isExpanded(node.id);
  const isActiveNote = activeNote && activeNote.id === node.id;
  const hasChildNotes =
    !!node.children.length || activeNote?.parentNoteId === node.id;
  const sidebarContext = useSidebarContext();
  const activeSidebarContext = useActiveSidebarContext();
  const { fetchChildNotes } = notes;
  // Keep expansion/data effects on the outer so they run regardless of whether
  // the heavy row content is currently mounted.
  React.useEffect(() => {
    if (expanded && !hasChildNotes) {
      expansion.collapse(node.id);
    }
  }, [expansion, expanded, hasChildNotes, node.id]);
  React.useEffect(() => {
    if (isActiveNote && (hasChildNotes || sidebarContext !== "notebooks")) {
      void fetchChildNotes(node.id);
    }
  }, [fetchChildNotes, node.id, hasChildNotes, sidebarContext, isActiveNote]);
  const insertDraftChild = !!(
    activeNote?.isDraft &&
    activeNote?.isActive &&
    activeNote?.parentNoteId === node.id
  );
  const draftNavNode = insertDraftChild
    ? activeNote?.asNavigationNode
    : undefined;
  const nodeChildren = React.useMemo(
    () =>
      notebook && draftNavNode
        ? sortNavigationNodes(
            [draftNavNode, ...node.children],
            notebook.sort,
            false
          )
        : node.children,
    [draftNavNode, notebook, node.children]
  );
  // Visibility gate: only mount the heavy inner content when scrolled near the
  // viewport, but keep it mounted while a drag is in progress so the dragged
  // source (or a drop target the user is heading toward) isn't yanked.
  const scrollRoot = useSidebarScrollElement();
  const placeholderRef = React.useRef<HTMLDivElement>(null);
  const observerOptions = React.useMemo(
    () => ({ root: scrollRoot, rootMargin: ROOT_MARGIN }),
    [scrollRoot]
  );
  const isOnScreen = useOnScreen(placeholderRef, observerOptions);
  const isDragActive = useIsDragActive();
  const [mounted, setMounted] = React.useState(false);
  // Flip mount state during render (not in an effect) so the first paint
  // already contains the row content when the placeholder is on screen,
  // avoiding a blank frame.
  if (isOnScreen && !mounted) {
    setMounted(true);
  } else if (!isOnScreen && !isDragActive && mounted) {
    setMounted(false);
  }
  // The inner row's own scrollIntoView only fires while it is mounted, which
  // skips active notes that are virtualized off-screen. Only scroll the tree
  // that matches the navigation context so a note rendered in multiple
  // contexts (collections/starred/shared) doesn't jump to an unexpected section;
  // when no context is set, fall back to the collections tree alone.
  React.useLayoutEffect(() => {
    if (
      isActiveNote &&
      (activeSidebarContext === sidebarContext ||
        (!activeSidebarContext && sidebarContext === "notebooks")) &&
      placeholderRef.current
    ) {
      scrollIntoView(placeholderRef.current, {
        scrollMode: "if-needed",
        behavior: "auto",
        boundary: (parent) => parent.id !== "sidebar",
      });
    }
  }, [isActiveNote, sidebarContext, activeSidebarContext]);
  return (
    <>
      <div ref={placeholderRef} style={{ minHeight: ROW_HEIGHT }}>
        {mounted ? (
          <NoteLinkInner {...props} hasChildren={nodeChildren.length > 0} />
        ) : null}
      </div>
      <Folder expanded={expanded}>
        {nodeChildren.map((childNode, childIndex) => (
          <NoteLink
            key={childNode.id}
            notebook={notebook}
            membership={props.membership}
            node={childNode}
            activeNote={activeNote}
            prefetchNote={props.prefetchNote}
            isDraft={childNode.isDraft}
            depth={props.depth + 1}
            index={childIndex}
            parentId={node.id}
          />
        ))}
      </Folder>
    </>
  );
});
type InnerProps = Props & {
  hasChildren: boolean;
};
const NoteLinkInner = observer(function NoteLinkInner({
  node,
  notebook,
  membership,
  prefetchNote,
  isDraft,
  depth,
  index,
  parentId,
  hasChildren,
}: InnerProps) {
  const { notes } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const can = usePolicy(node.id);
  const canUpdate = can.update;
  const note = notes.get(node.id);
  const [isEditing, setIsEditing] = React.useState(false);
  const editableTitleRef = React.useRef<RefHandle>(null);
  const sidebarContext = useSidebarContext();
  const user = useCurrentUser();
  const expansion = useSidebarExpansion();
  const expanded = expansion.isExpanded(node.id);
  const handleDisclosureClick = React.useCallback(
    (ev?: React.MouseEvent<HTMLElement>) => {
      if (expanded) {
        if (ev?.altKey) {
          expansion.collapseDescendants(node);
        } else {
          expansion.collapse(node.id);
        }
      } else {
        if (ev?.altKey) {
          expansion.expandDescendants(node);
        } else {
          expansion.expand(node.id);
        }
      }
    },
    [expansion, expanded, node]
  );
  const handleExpand = React.useCallback(() => {
    expansion.expand(node.id);
  }, [expansion, node.id]);
  const handleCollapse = React.useCallback(() => {
    expansion.collapse(node.id);
  }, [expansion, node.id]);
  const handlePrefetch = React.useCallback(() => {
    void Scenes.Note.preload();
    void prefetchNote?.(node.id);
  }, [prefetchNote, node]);
  const handleTitleChange = React.useCallback(
    async (value: string) => {
      if (!note) {
        return;
      }
      await notes.update({
        id: note.id,
        title: value,
      });
    },
    [notes, note]
  );
  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);
  const toPath = React.useMemo(
    () => ({
      pathname: node.url,
      state: {
        title: node.title,
        sidebarContext,
      },
    }),
    [node.url, node.title, sidebarContext]
  );
  const isActiveCheck = React.useCallback(
    (
      match,
      location: Location<{
        sidebarContext?: SidebarContextType;
      }>
    ) => {
      if (sidebarContext !== location.state?.sidebarContext) {
        return false;
      }
      return (note && location.pathname.endsWith(note.urlId)) || !!match;
    },
    [sidebarContext, note]
  );
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  // Computed so that a change to movingNoteId only re-renders the rows
  // whose boolean actually flips, not every observer of the store field.
  const isMoving = useComputed(
    () => notes.movingNoteId === node.id,
    [notes, node.id]
  );
  const icon = note?.icon || node.icon || node.emoji;
  const color = note?.color || node.color;
  const initial = note?.initial || node.title.charAt(0).toUpperCase();
  const iconElement = React.useMemo(
    () =>
      icon ? <Icon value={icon} color={color} initial={initial} /> : undefined,
    [icon, color, initial]
  );
  const [{ isDragging }, drag] = useDragNote(node, depth, note, isEditing);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [{ isOverReparent }, dropToReparent] = useDropToReparentNote(
    node,
    handleExpand,
    parentRef
  );
  // Fall back so note-only access (e.g. "Manage" on a parent) can reorder.
  const moveNotebookId = notebook?.id ?? note?.notebookId;
  const [{ isOverReorder: isOverReorderAbove }, dropToReorderAbove] =
    useDropToReorderNote(node, notebook, (item) => {
      if (!moveNotebookId) {
        return;
      }
      return {
        noteId: item.id,
        notebookId: moveNotebookId,
        parentNoteId: parentId,
        index,
      };
    });
  const [{ isOverReorder }, dropToReorder] = useDropToReorderNote(
    node,
    notebook,
    (item) => {
      if (!moveNotebookId) {
        return;
      }
      if (expansion.isExpanded(node.id)) {
        return {
          noteId: item.id,
          notebookId: moveNotebookId,
          parentNoteId: node.id,
          index: 0,
        };
      }
      return {
        noteId: item.id,
        notebookId: moveNotebookId,
        parentNoteId: parentId,
        index: index + 1,
      };
    }
  );
  const title = note?.title || node.title || t("Untitled");
  const handleNewDoc = React.useCallback(
    async (input: string) => {
      const newNote = await notes.create(
        {
          notebookId: notebook?.id,
          parentNoteId: node.id,
          fullWidth:
            note?.fullWidth ??
            user.getPreference(UserPreference.FullWidthNotes),
          title: input,
          data: ProsemirrorDataHelper.getEmpty(),
        },
        { publish: true }
      );
      notebook?.addNote(newNote, node.id);
      membership?.addNote(newNote, node.id);
      history.push({
        pathname: noteEditPath(newNote),
        state: { sidebarContext },
      });
    },
    [notes, notebook, membership, sidebarContext, user, node.id, note, history]
  );
  const contextMenuAction = useNoteMenuAction({
    noteId: node.id,
    onRename: handleRename,
  });
  const menu = note ? (
    <NoteMenu
      note={note}
      onRename={handleRename}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  ) : undefined;
  // Without a collection we can't read isManualSort; fall back to the shared
  // membership's permission, which is the same for every descendant.
  const canReorderHere = notebook
    ? notebook.isManualSort
    : membership?.permission === NotePermission.Admin ||
      membership?.permission === NotePermission.ReadWrite;
  // Cursors stay mounted between drags so that drag start/end doesn't change
  // the tree for every row.
  const cursorBefore =
    canReorderHere && index === 0 ? (
      <DropCursor
        isActiveDrop={isOverReorderAbove}
        innerRef={dropToReorderAbove}
        position="top"
      />
    ) : undefined;
  const cursorAfter = canReorderHere ? (
    <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
  ) : undefined;
  return (
    <NoteRow
      noteId={node.id}
      note={note}
      to={toPath}
      depth={depth}
      isDraft={isDraft}
      scrollIntoViewIfNeeded={false}
      icon={iconElement}
      canEdit={canUpdate}
      labelText={title}
      onTitleChange={handleTitleChange}
      editableTitleRef={editableTitleRef}
      onEditingChange={setIsEditing}
      expanded={expanded && !isDragging}
      hasChildren={hasChildren}
      onDisclosureClick={handleDisclosureClick}
      onExpand={handleExpand}
      onCollapse={handleCollapse}
      dragRef={drag}
      isDragging={isDragging}
      isMoving={isMoving}
      parentRef={parentRef}
      dropToReparentRef={dropToReparent}
      isActiveDropTarget={isOverReparent}
      cursorBefore={cursorBefore}
      cursorAfter={cursorAfter}
      menu={menu}
      menuOpen={menuOpen}
      canCreateChild={can.createChildNote}
      onCreateChild={handleNewDoc}
      contextAction={contextMenuAction}
      isActiveOverride={isActiveCheck}
      onClickIntent={handlePrefetch}
    />
  );
});
export default NoteLink;
