import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { useState, useEffect, useCallback } from "react";
import type { DropTargetMonitor } from "react-dnd";
import { useDrop, useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import styled from "styled-components";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import { useActiveSidebarContext } from "~/hooks/useActiveSidebarContext";
import useStores from "~/hooks/useStores";
import type { DragObject } from "../hooks/useDragAndDrop";
import NotebookLink from "./NotebookLink";
import DropCursor from "./DropCursor";
import SidebarDisclosureContext, {
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";
import Relative from "./Relative";
import { useSidebarContext } from "./SidebarContext";
type Props = {
  notebook: Notebook;
  activeNote: Note | undefined;
  belowNotebook: Notebook | void;
};
function DraggableNotebookLink({ notebook, activeNote, belowNotebook }: Props) {
  const activeSidebarContext = useActiveSidebarContext();
  const sidebarContext = useSidebarContext();
  const { ui, policies, notebooks } = useStores();
  const [expanded, setExpanded] = useState(
    notebook.id === ui.activeNotebookId &&
      sidebarContext === activeSidebarContext
  );
  const belowNotebookIndex = belowNotebook ? belowNotebook.index : null;
  // Context-based recursive expand/collapse for descendant NoteLinks
  const { event: disclosureEvent, onDisclosureClick } =
    useSidebarDisclosureState();
  // Drop to reorder collection
  const [{ isNotebookDropping, isDraggingAnyNotebook }, dropToReorderNotebook] =
    useDrop({
      accept: "collection",
      drop: (item: DragObject) => {
        void notebooks.move(
          item.id,
          fractionalIndex(notebook.index, belowNotebookIndex)
        );
      },
      canDrop: (item) =>
        notebook.id !== item.id &&
        (!belowNotebook || item.id !== belowNotebook.id) &&
        !!policies.abilities(item.id).move,
      collect: (monitor: DropTargetMonitor<Notebook, Notebook>) => ({
        isNotebookDropping: monitor.isOver(),
        isDraggingAnyNotebook: monitor.canDrop(),
      }),
    });
  // Drag to reorder collection
  const [{ isDragging }, dragToReorderNotebook, preview] = useDrag({
    type: "collection",
    item: () => ({
      id: notebook.id,
      title: notebook.name,
      icon: <CollectionIcon notebook={notebook} />,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);
  // If the current collection is active and relevant to the sidebar section we
  // are in then expand it automatically
  useEffect(() => {
    if (
      notebook.id === ui.activeNotebookId &&
      sidebarContext === activeSidebarContext
    ) {
      setExpanded(true);
    }
  }, [notebook.id, ui.activeNotebookId, sidebarContext, activeSidebarContext]);
  const handleDisclosureClick = useCallback(
    (ev) => {
      ev?.preventDefault();
      setExpanded((e) => {
        const willExpand = !e;
        onDisclosureClick(willExpand, !!ev?.altKey);
        return willExpand;
      });
    },
    [onDisclosureClick]
  );
  const displayChildNotes = expanded && !isDragging;
  return (
    <SidebarDisclosureContext.Provider value={disclosureEvent}>
      <Draggable
        key={notebook.id}
        ref={dragToReorderNotebook}
        $isDragging={isDragging}
      >
        <NotebookLink
          notebook={notebook}
          expanded={displayChildNotes}
          activeNote={activeNote}
          onDisclosureClick={handleDisclosureClick}
          isDraggingAnyNotebook={isDraggingAnyNotebook}
        />
      </Draggable>
      <Relative>
        {isDraggingAnyNotebook && (
          <DropCursor
            isActiveDrop={isNotebookDropping}
            innerRef={dropToReorderNotebook}
          />
        )}
      </Relative>
    </SidebarDisclosureContext.Provider>
  );
}
const Draggable = styled("div")<{
  $isDragging: boolean;
}>`
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};
  pointer-events: ${(props) => (props.$isDragging ? "none" : "inherit")};
`;
export default observer(DraggableNotebookLink);
