import fractionalIndex from "fractional-index";
import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { IconType, NotificationEventType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type GroupMembership from "~/models/GroupMembership";
import UserMembership from "~/models/UserMembership";
import { useActiveSidebarContext } from "~/hooks/useActiveSidebarContext";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import NoteMenu from "~/menus/NoteMenu";
import * as Scenes from "~/routes/scenes";
import {
  useDragMembership,
  useDropToReorderUserMembership,
  useDropToReparentNote,
} from "../hooks/useDragAndDrop";
import SidebarExpansionContext, {
  useSidebarExpansionState,
} from "./SidebarExpansionContext";
import { useSidebarLabelAndIcon } from "../hooks/useSidebarLabelAndIcon";
import NoteLink from "./NoteLink";
import NoteRow from "./NoteRow";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import SidebarDisclosureContext, {
  useSidebarDisclosure,
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";
import { useSidebarContext, type SidebarContextType } from "./SidebarContext";
type Props = {
  membership: UserMembership | GroupMembership;
  depth?: number;
};
function SharedWithMeLink({ membership, depth = 0 }: Props) {
  const { ui, notebooks, notes } = useStores();
  const { fetchChildNotes } = notes;
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { noteId } = membership;
  const isActiveNote = noteId === ui.activeNoteId;
  const activeSidebarContext = useActiveSidebarContext();
  const sidebarContext = useSidebarContext();
  const note = noteId ? notes.get(noteId) : undefined;
  const membershipNotes = membership.notes;
  const expansion = useSidebarExpansionState(membershipNotes, ui.activeNoteId);
  const isActiveNoteInPath = ui.activeNoteId
    ? membership.pathToNote(ui.activeNoteId).length > 0
    : false;
  const [expanded, setExpanded, setCollapsed] = useBoolean(
    isActiveNoteInPath && activeSidebarContext === sidebarContext
  );
  const { event: disclosureEvent, onDisclosureClick } =
    useSidebarDisclosureState();
  useSidebarDisclosure(setExpanded, setCollapsed);
  React.useEffect(() => {
    if (isActiveNoteInPath && activeSidebarContext === sidebarContext) {
      setExpanded();
    }
  }, [isActiveNoteInPath, sidebarContext, activeSidebarContext, setExpanded]);
  React.useEffect(() => {
    if (noteId) {
      void notes.fetch(noteId);
      void membership.fetchNotes();
    }
  }, [noteId, notes, membership]);
  React.useEffect(() => {
    if (isActiveNote && membership.noteId) {
      void fetchChildNotes(membership.noteId);
    }
  }, [fetchChildNotes, isActiveNote, membership.noteId]);
  const handleDisclosureClick = React.useCallback(
    (ev?: React.MouseEvent<HTMLElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      const willExpand = !expanded;
      if (willExpand) {
        setExpanded();
        if (ev?.altKey && membershipNotes) {
          expansion.expandAll(membershipNotes);
        }
      } else {
        setCollapsed();
        if (ev?.altKey) {
          expansion.collapseAll();
        }
      }
      onDisclosureClick(willExpand, !!ev?.altKey);
    },
    [
      expanded,
      setExpanded,
      setCollapsed,
      onDisclosureClick,
      expansion,
      membershipNotes,
    ]
  );
  const parentRef = React.useRef<HTMLDivElement>(null);
  const reparentableNode = React.useMemo(() => note?.asNavigationNode, [note]);
  const [{ isOverReparent }, dropToReparent] = useDropToReparentNote(
    reparentableNode,
    setExpanded,
    parentRef
  );
  const { icon } = useSidebarLabelAndIcon(membership);
  const [{ isDragging }, draggableRef] = useDragMembership(membership);
  const getIndex = () => {
    if (membership instanceof UserMembership) {
      const next = membership?.next();
      return fractionalIndex(membership?.index || null, next?.index || null);
    }
    return "";
  };
  const [reorderProps, dropToReorderRef] =
    useDropToReorderUserMembership(getIndex);
  const isActive = React.useCallback(
    (
      match,
      location: Location<{
        sidebarContext?: SidebarContextType;
      }>
    ) => !!match && location.state?.sidebarContext === sidebarContext,
    [sidebarContext]
  );
  const displayChildNotes = expanded && !isDragging;
  if (!note) {
    return null;
  }
  const { icon: docIcon } = note;
  const label =
    determineIconType(docIcon) === IconType.Emoji
      ? note.title.replace(docIcon!, "")
      : note.titleWithDefault;
  const notebook = note.notebookId ? notebooks.get(note.notebookId) : undefined;
  const childNotes = membershipNotes ?? [];
  const hasChildren = childNotes.length > 0;
  const unreadBadge =
    note.unreadNotifications.filter(
      (notification) =>
        notification.event === NotificationEventType.AddUserToNote
    ).length > 0;
  const menu = !isDragging ? (
    <NoteMenu note={note} onOpen={handleMenuOpen} onClose={handleMenuClose} />
  ) : undefined;
  return (
    <NoteRow
      noteId={noteId ?? ""}
      note={note}
      to={{ pathname: note.path, state: { sidebarContext } }}
      onClickIntent={Scenes.Note.preload}
      depth={depth}
      icon={icon}
      canEdit={false}
      label={label}
      unreadBadge={unreadBadge}
      expanded={expanded && !isDragging}
      hasChildren={hasChildren}
      onDisclosureClick={handleDisclosureClick}
      onExpand={setExpanded}
      onCollapse={setCollapsed}
      dragRef={draggableRef}
      isDragging={isDragging}
      parentRef={parentRef}
      dropToReparentRef={dropToReparent}
      isActiveDropTarget={isOverReparent}
      menu={menu}
      menuOpen={menuOpen}
      isActiveOverride={isActive}
    >
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
        <SidebarExpansionContext.Provider value={expansion}>
          <Folder expanded={displayChildNotes}>
            {childNotes.map((childNode, index) => (
              <NoteLink
                key={childNode.id}
                node={childNode}
                notebook={notebook}
                membership={membership}
                activeNote={notes.active}
                isDraft={childNode.isDraft}
                depth={depth + 1}
                index={index}
                parentId={note.id}
              />
            ))}
          </Folder>
        </SidebarExpansionContext.Provider>
      </SidebarDisclosureContext.Provider>
      {reorderProps.isDragging && (
        <DropCursor
          isActiveDrop={reorderProps.isOverCursor}
          innerRef={dropToReorderRef}
        />
      )}
    </NoteRow>
  );
}
export default observer(SharedWithMeLink);
