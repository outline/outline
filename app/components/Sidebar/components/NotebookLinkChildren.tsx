import { noop } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import NotesLoader from "~/components/NotesLoader";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import useNotebookNotes from "../hooks/useNotebookNotes";
import { useDropToChangeNotebook } from "../hooks/useDragAndDrop";
import SidebarExpansionContext, {
  useSidebarExpansionState,
} from "./SidebarExpansionContext";
import NoteLink from "./NoteLink";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import PlaceholderNotebooks from "./PlaceholderNotebooks";
import { useSidebarDisclosure } from "./SidebarDisclosureContext";
import SidebarLink from "./SidebarLink";
// The number of child notes to initially render
const DEFAULT_PAGE_SIZE = 50;
type Props = {
  /** The collection to render the children of. */
  notebook: Notebook;
  /** Whether the children are shown in an expanded state. */
  expanded: boolean;
  /** Indentation depth of the parent collection. */
  depth?: number;
  /** Function to prefetch a note by ID. */
  prefetchNote?: (noteId: string) => Promise<Note | void>;
  /** Element to display above the child notes */
  children?: React.ReactNode;
};
function NotebookLinkChildren({
  notebook,
  expanded,
  depth = 0,
  prefetchNote,
  children,
}: Props) {
  // Notes sit one level below the collection, with a minimum that leaves
  // room for their own disclosure to the left of the label.
  const childDepth = Math.max(depth + 1, 2);
  const pageSize = DEFAULT_PAGE_SIZE;
  const { notes, ui } = useStores();
  const { t } = useTranslation();
  const activeNote = notes.active;
  const childNotes = useNotebookNotes(notebook, activeNote);
  const [showing, setShowing] = useState(pageSize);
  useEffect(() => {
    if (!expanded) {
      setShowing(pageSize);
    }
  }, [expanded, pageSize]);
  const showMore = useCallback(() => {
    if (childNotes && childNotes.length > showing) {
      setShowing((value) => value + pageSize);
    }
  }, [childNotes, showing, pageSize]);
  const expansion = useSidebarExpansionState(childNotes, ui.activeNoteId);
  // Handle collection-level alt-click cascade from DraggableNotebookLink
  const handleCascadeExpand = useCallback(() => {
    if (childNotes) {
      expansion.expandAll(childNotes);
    }
  }, [expansion, childNotes]);
  const handleCascadeCollapse = useCallback(() => {
    expansion.collapseAll();
  }, [expansion]);
  useSidebarDisclosure(handleCascadeExpand, handleCascadeCollapse);
  return (
    <SidebarExpansionContext.Provider value={expansion}>
      <Folder expanded={expanded}>
        <DynamicDropCursor notebook={notebook} />
        <NotesLoader notebook={notebook} enabled={expanded}>
          {children}
          {!childNotes && (
            <ResizingHeightContainer hideOverflow>
              <Loading />
            </ResizingHeightContainer>
          )}
          {childNotes?.slice(0, showing).map((node, index) => (
            <NoteLink
              key={node.id}
              node={node}
              notebook={notebook}
              activeNote={activeNote}
              prefetchNote={prefetchNote}
              isDraft={node.isDraft}
              depth={childDepth}
              index={index}
            />
          ))}
          {childNotes?.length === 0 && !children && (
            <SidebarLink
              label={
                <Text type="tertiary" size="small" italic>
                  {t("Empty")}
                </Text>
              }
              onClick={() => history.push(notebook.url)}
              depth={childDepth}
            />
          )}
          {childNotes && (
            <Waypoint key={showing} onEnter={showMore} fireOnRapidScroll />
          )}
        </NotesLoader>
      </Folder>
    </SidebarExpansionContext.Provider>
  );
}
const DynamicDropCursor = observer(({ notebook }: { notebook: Notebook }) => {
  const dummyRef = useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }] = useDropToChangeNotebook(
    notebook,
    noop,
    dummyRef
  );
  if (!canDrop || !notebook.isManualSort) {
    return null;
  }
  return (
    <DropCursor isActiveDrop={isOver} innerRef={dummyRef} position="top" />
  );
});
const Loading = styled(PlaceholderNotebooks)`
  margin-inline-start: 44px;
  min-height: 90px;
`;
export default observer(NotebookLinkChildren);
