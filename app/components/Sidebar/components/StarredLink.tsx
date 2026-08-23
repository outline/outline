import fractionalIndex from "fractional-index";
import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { type NavigationNode, UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import type Star from "~/models/Star";
import type { RefHandle } from "~/components/EditableTitle";
import { useActiveSidebarContext } from "~/hooks/useActiveSidebarContext";
import useBoolean from "~/hooks/useBoolean";
import { useNotebookMenuAction } from "~/hooks/useNotebookMenuAction";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useNoteMenuAction } from "~/hooks/useNoteMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import NotebookMenu from "~/menus/NotebookMenu";
import NoteMenu from "~/menus/NoteMenu";
import * as Scenes from "~/routes/scenes";
import { noteEditPath } from "~/utils/routeHelpers";
import {
  useDragStar,
  useDropToChangeNotebook,
  useDropToCreateStar,
  useDropToReorderStar,
} from "../hooks/useDragAndDrop";
import { useSidebarLabelAndIcon } from "../hooks/useSidebarLabelAndIcon";
import SidebarExpansionContext, {
  useSidebarExpansionState,
} from "./SidebarExpansionContext";
import NotebookLinkChildren from "./NotebookLinkChildren";
import NotebookRow from "./NotebookRow";
import NoteLink from "./NoteLink";
import NoteRow from "./NoteRow";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import Relative from "./Relative";
import type { SidebarContextType } from "./SidebarContext";
import SidebarContext, { starredSidebarContext } from "./SidebarContext";
import SidebarDisclosureContext, {
  useSidebarDisclosure,
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";
type Props = {
  star: Star;
};
type StarredNoteLinkProps = {
  star: Star;
  note: Note;
  expanded: boolean;
  sidebarContext: SidebarContextType;
  handleDisclosureClick: (ev?: React.MouseEvent<HTMLElement>) => void;
  handlePrefetch: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  icon: React.ReactNode;
  menuOpen: boolean;
  handleMenuOpen: () => void;
  handleMenuClose: () => void;
  cursor: React.ReactNode;
};
type StarredNotebookLinkProps = {
  star: Star;
  notebook: Notebook;
  expanded: boolean;
  sidebarContext: SidebarContextType;
  handleDisclosureClick: (ev?: React.MouseEvent<HTMLElement>) => void;
  cursor: React.ReactNode;
  isDraggingAnyStar: boolean;
};
const emptyChildNotes: NavigationNode[] = [];
const StarredNoteLink = observer(function StarredNoteLink({
  star,
  note,
  expanded,
  sidebarContext,
  handleDisclosureClick,
  handlePrefetch,
  onExpand,
  onCollapse,
  icon,
  menuOpen,
  handleMenuOpen,
  handleMenuClose,
  cursor,
}: StarredNoteLinkProps) {
  const history = useHistory();
  const user = useCurrentUser();
  const { notebooks, notes } = useStores();
  const can = usePolicy(note);
  const editableTitleRef = React.useRef<RefHandle>(null);
  const [{ isDragging }, draggableRef] = useDragStar(star);
  const noteNotebook = note.notebookId
    ? notebooks.get(note.notebookId)
    : undefined;
  const childNotes = noteNotebook
    ? noteNotebook.getChildrenForNote(note.id)
    : emptyChildNotes;
  const hasChildNotes = childNotes.length > 0;
  const displayChildNotes = expanded && !isDragging;
  const expansion = useSidebarExpansionState(childNotes, notes.active?.id);
  const handleCascadeExpand = React.useCallback(() => {
    if (childNotes.length) {
      expansion.expandAll(childNotes);
    }
  }, [expansion, childNotes]);
  const handleCascadeCollapse = React.useCallback(() => {
    expansion.collapseAll();
  }, [expansion]);
  useSidebarDisclosure(handleCascadeExpand, handleCascadeCollapse);
  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);
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
  const handleNewDoc = React.useCallback(
    async (input: string) => {
      if (!note) {
        return;
      }
      const newNote = await notes.create(
        {
          notebookId: noteNotebook?.id,
          parentNoteId: note.id,
          fullWidth:
            note.fullWidth ?? user.getPreference(UserPreference.FullWidthNotes),
          title: input,
          data: ProsemirrorDataHelper.getEmpty(),
        },
        { publish: true }
      );
      noteNotebook?.addNote(newNote, note.id);
      history.push({
        pathname: noteEditPath(newNote),
        state: { sidebarContext },
      });
    },
    [notes, note, noteNotebook, sidebarContext, user, history]
  );
  const contextMenuAction = useNoteMenuAction({
    noteId: note.id,
    onRename: handleRename,
  });
  const isActive = React.useCallback(
    (
      match,
      location: Location<{
        sidebarContext?: SidebarContextType;
      }>
    ) => {
      if (location.state?.sidebarContext !== sidebarContext) {
        return false;
      }
      return !!match || (!!note && location.pathname.endsWith(note.urlId));
    },
    [sidebarContext, note]
  );
  const menu = (
    <NoteMenu
      note={note}
      onRename={handleRename}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  );
  return (
    <Draggable ref={draggableRef} $isDragging={isDragging}>
      <NoteRow
        noteId={note.id}
        note={note}
        to={{ pathname: note.path, state: { sidebarContext } }}
        depth={0}
        icon={icon}
        canEdit={can.update}
        labelText={note.titleWithDefault}
        onTitleChange={handleTitleChange}
        editableTitleRef={editableTitleRef}
        expanded={expanded}
        hasChildren={hasChildNotes}
        onDisclosureClick={handleDisclosureClick}
        onExpand={onExpand}
        onCollapse={onCollapse}
        isDragging={isDragging}
        menu={menu}
        menuOpen={menuOpen}
        canCreateChild={can.createChildNote}
        onCreateChild={handleNewDoc}
        newChildDepth={2}
        contextAction={contextMenuAction}
        isActiveOverride={isActive}
        onClickIntent={handlePrefetch}
      >
        <SidebarContext.Provider value={sidebarContext}>
          <SidebarExpansionContext.Provider value={expansion}>
            <Relative>
              <Folder expanded={displayChildNotes}>
                {childNotes.map((node, index) => (
                  <NoteLink
                    key={node.id}
                    node={node}
                    notebook={noteNotebook}
                    activeNote={notes.active}
                    prefetchNote={notes.prefetchNote}
                    isDraft={node.isDraft}
                    depth={2}
                    index={index}
                    parentId={note.id}
                  />
                ))}
              </Folder>
              {cursor}
            </Relative>
          </SidebarExpansionContext.Provider>
        </SidebarContext.Provider>
      </NoteRow>
    </Draggable>
  );
});
const StarredNotebookLink = observer(function StarredNotebookLink({
  star,
  notebook,
  expanded,
  sidebarContext,
  handleDisclosureClick,
  cursor,
  isDraggingAnyStar,
}: StarredNotebookLinkProps) {
  const { notes } = useStores();
  const history = useHistory();
  const user = useCurrentUser();
  const can = usePolicy(notebook.id);
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const editableTitleRef = React.useRef<RefHandle>(null);
  const [{ isDragging }, draggableRef] = useDragStar(star);
  const displayChildNotes = expanded && !isDragging;
  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await notebook.save({ name });
    },
    [notebook]
  );
  const handleExpand = React.useCallback(() => {
    if (!displayChildNotes) {
      handleDisclosureClick();
    }
  }, [displayChildNotes, handleDisclosureClick]);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, dropRef] = useDropToChangeNotebook(
    notebook,
    handleExpand,
    parentRef
  );
  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);
  const handlePrefetch = React.useCallback(() => {
    void Scenes.Notebook.preload();
    void notebook.fetchNotes();
  }, [notebook]);
  const handleNewDoc = React.useCallback(
    async (input: string) => {
      const newNote = await notes.create(
        {
          notebookId: notebook.id,
          title: input,
          fullWidth: user.getPreference(UserPreference.FullWidthNotes),
          data: ProsemirrorDataHelper.getEmpty(),
        },
        { publish: true }
      );
      notebook?.addNote(newNote);
      history.push({
        pathname: noteEditPath(newNote),
        state: { sidebarContext },
      });
    },
    [user, sidebarContext, history, notebook, notes]
  );
  const contextMenuAction = useNotebookMenuAction({
    notebookId: notebook.id,
    onRename: handleRename,
  });
  const menu = !isDraggingAnyStar ? (
    <NotebookMenu
      notebook={notebook}
      onRename={handleRename}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  ) : undefined;
  return (
    <SidebarContext.Provider value={sidebarContext}>
      <Draggable ref={draggableRef} $isDragging={isDragging}>
        <NotebookRow
          notebook={notebook}
          to={{ pathname: notebook.path, state: { sidebarContext } }}
          expanded={isDragging ? undefined : displayChildNotes}
          onDisclosureClick={handleDisclosureClick}
          onExpand={handleExpand}
          onClickIntent={handlePrefetch}
          canEdit={can.update}
          labelText={notebook.name}
          onTitleChange={handleTitleChange}
          editableTitleRef={editableTitleRef}
          contextAction={contextMenuAction}
          menu={menu}
          menuOpen={menuOpen}
          canCreateChild={!isDraggingAnyStar && can.createNote}
          onCreateChild={handleNewDoc}
          parentRef={parentRef}
          dropRef={dropRef}
          isActiveDropTarget={isOver && canDrop}
        >
          <NotebookLinkChildren
            notebook={notebook}
            expanded={displayChildNotes}
            prefetchNote={notes.prefetchNote}
          />
        </NotebookRow>
      </Draggable>
      <Relative>{cursor}</Relative>
    </SidebarContext.Provider>
  );
});
function StarredLink({ star }: Props) {
  const { ui, notebooks, notes } = useStores();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { noteId, notebookId } = star;
  const notebook = notebookId ? notebooks.get(notebookId) : undefined;
  const note = noteId ? notes.get(noteId) : undefined;
  const activeSidebarContext = useActiveSidebarContext();
  const sidebarContext = starredSidebarContext(
    star.noteId ?? star.notebookId ?? ""
  );
  const [expanded, setExpanded] = useState(
    (star.noteId
      ? star.noteId === ui.activeNoteId
      : star.notebookId === ui.activeNotebookId) &&
      sidebarContext === activeSidebarContext
  );
  const { event: disclosureEvent, onDisclosureClick } =
    useSidebarDisclosureState();
  React.useEffect(() => {
    if (
      star.noteId === ui.activeNoteId &&
      sidebarContext === activeSidebarContext
    ) {
      setExpanded(true);
    } else if (
      star.notebookId === ui.activeNotebookId &&
      sidebarContext === activeSidebarContext
    ) {
      setExpanded(true);
    }
  }, [
    star.noteId,
    star.notebookId,
    ui.activeNoteId,
    ui.activeNotebookId,
    sidebarContext,
    activeSidebarContext,
  ]);
  useEffect(() => {
    if (noteId) {
      void notes.fetch(noteId);
    }
  }, [noteId, notes]);
  const handleDisclosureClick = React.useCallback(
    (ev?: React.MouseEvent<HTMLElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      setExpanded((prevExpanded) => {
        const willExpand = !prevExpanded;
        onDisclosureClick(willExpand, !!ev?.altKey);
        return willExpand;
      });
    },
    [onDisclosureClick]
  );
  const handleExpand = React.useCallback(() => {
    setExpanded(true);
  }, []);
  const handleCollapse = React.useCallback(() => {
    setExpanded(false);
  }, []);
  const handlePrefetch = React.useCallback(() => {
    if (noteId) {
      void Scenes.Note.preload();
      void notes.prefetchNote(noteId);
      const note = notes.get(noteId);
      const noteNotebook = note?.notebookId
        ? notebooks.get(note.notebookId)
        : undefined;
      void noteNotebook?.fetchNotes();
    }
  }, [notes, noteId, notebooks]);
  const getIndex = () => {
    const next = star?.next();
    return fractionalIndex(star?.index || null, next?.index || null);
  };
  const { icon } = useSidebarLabelAndIcon(star);
  const [reorderStarProps, dropToReorderRef] = useDropToReorderStar(getIndex);
  const [createStarProps, dropToStarRef] = useDropToCreateStar(getIndex);
  const cursor = (
    <>
      {reorderStarProps.isDragging && (
        <DropCursor
          isActiveDrop={reorderStarProps.isOverCursor}
          innerRef={dropToReorderRef}
        />
      )}
      {createStarProps.isDragging && (
        <DropCursor
          isActiveDrop={createStarProps.isOverCursor}
          innerRef={dropToStarRef}
        />
      )}
    </>
  );
  if (note) {
    return (
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
        <StarredNoteLink
          star={star}
          note={note}
          expanded={expanded}
          sidebarContext={sidebarContext}
          handleDisclosureClick={handleDisclosureClick}
          handlePrefetch={handlePrefetch}
          onExpand={handleExpand}
          onCollapse={handleCollapse}
          icon={icon}
          menuOpen={menuOpen}
          handleMenuOpen={handleMenuOpen}
          handleMenuClose={handleMenuClose}
          cursor={cursor}
        />
      </SidebarDisclosureContext.Provider>
    );
  }
  if (notebook) {
    return (
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
        <StarredNotebookLink
          star={star}
          notebook={notebook}
          expanded={expanded}
          sidebarContext={sidebarContext}
          handleDisclosureClick={handleDisclosureClick}
          cursor={cursor}
          isDraggingAnyStar={reorderStarProps.isDragging}
        />
      </SidebarDisclosureContext.Provider>
    );
  }
  return null;
}
const Draggable = styled.div<{
  $isDragging?: boolean;
}>`
  position: relative;
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};
`;
export default observer(StarredLink);
