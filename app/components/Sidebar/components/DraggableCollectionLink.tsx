import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { useState, useEffect, useCallback } from "react";
import type { DropTargetMonitor } from "react-dnd";
import { useDrop, useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import styled from "styled-components";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import type { DragObject } from "../hooks/useDragAndDrop";
import CollectionLink from "./CollectionLink";
import DropCursor from "./DropCursor";
import Relative from "./Relative";
import { useSidebarContext } from "./SidebarContext";

type Props = {
  collection: Collection;
  activeDocument: Document | undefined;
  belowCollection: Collection | void;
};

function DraggableCollectionLink({
  collection,
  activeDocument,
  belowCollection,
}: Props) {
  const locationSidebarContext = useLocationSidebarContext();
  const sidebarContext = useSidebarContext();
  const { ui, policies, collections } = useStores();
  const [expanded, setExpanded] = useState(
    collection.id === ui.activeCollectionId &&
      sidebarContext === locationSidebarContext
  );
  const belowCollectionIndex = belowCollection ? belowCollection.index : null;

  // Drop to reorder collection
  const [
    { isCollectionDropping, isDraggingAnyCollection },
    dropToReorderCollection,
  ] = useDrop({
    accept: "collection",
    drop: (item: DragObject) => {
      void collections.move(
        item.id,
        fractionalIndex(collection.index, belowCollectionIndex)
      );
    },
    canDrop: (item) =>
      collection.id !== item.id &&
      (!belowCollection || item.id !== belowCollection.id) &&
      policies.abilities(item.id)?.move,
    collect: (monitor: DropTargetMonitor<Collection, Collection>) => ({
      isCollectionDropping: monitor.isOver(),
      isDraggingAnyCollection: monitor.canDrop(),
    }),
  });

  // Drag to reorder collection
  const [{ isDragging }, dragToReorderCollection, preview] = useDrag({
    type: "collection",
    item: () => ({
      id: collection.id,
      title: collection.name,
      icon: <CollectionIcon collection={collection} />,
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
      collection.id === ui.activeCollectionId &&
      sidebarContext === locationSidebarContext
    ) {
      setExpanded(true);
    }
  }, [
    collection.id,
    ui.activeCollectionId,
    sidebarContext,
    locationSidebarContext,
  ]);

  const handleDisclosureClick = useCallback((ev) => {
    ev?.preventDefault();
    setExpanded((e) => !e);
  }, []);

  const displayChildDocuments = expanded && !isDragging;

  return (
    <>
      <Draggable
        key={collection.id}
        ref={dragToReorderCollection}
        $isDragging={isDragging}
      >
        <CollectionLink
          collection={collection}
          expanded={displayChildDocuments}
          activeDocument={activeDocument}
          onDisclosureClick={handleDisclosureClick}
          isDraggingAnyCollection={isDraggingAnyCollection}
        />
      </Draggable>
      <Relative>
        {isDraggingAnyCollection && (
          <DropCursor
            isActiveDrop={isCollectionDropping}
            innerRef={dropToReorderCollection}
          />
        )}
      </Relative>
    </>
  );
}

const Draggable = styled("div")<{ $isDragging: boolean }>`
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};
  pointer-events: ${(props) => (props.$isDragging ? "none" : "inherit")};
`;

export default observer(DraggableCollectionLink);
