import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop, useDrag, DropTargetMonitor } from "react-dnd";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import CollectionLink from "./CollectionLink";
import CollectionLinkChildren from "./CollectionLinkChildren";
import DropCursor from "./DropCursor";
import Relative from "./Relative";
import { DragObject } from "./SidebarLink";

type Props = {
  collection: Collection;
  activeDocument: Document | undefined;
  prefetchDocument: (id: string) => Promise<Document | void>;
  belowCollection: Collection | void;
};

function useLocationStateStarred() {
  const location = useLocation<{
    starred?: boolean;
  }>();
  return location.state?.starred;
}

function DraggableCollectionLink({
  collection,
  activeDocument,
  prefetchDocument,
  belowCollection,
}: Props) {
  const locationStateStarred = useLocationStateStarred();
  const { ui, collections } = useStores();
  const [expanded, setExpanded] = React.useState(
    collection.id === ui.activeCollectionId && !locationStateStarred
  );
  const can = usePolicy(collection.id);
  const belowCollectionIndex = belowCollection ? belowCollection.index : null;

  // Drop to reorder collection
  const [
    { isCollectionDropping, isDraggingAnyCollection },
    dropToReorderCollection,
  ] = useDrop({
    accept: "collection",
    drop: (item: DragObject) => {
      collections.move(
        item.id,
        fractionalIndex(collection.index, belowCollectionIndex)
      );
    },
    canDrop: (item) => {
      return (
        collection.id !== item.id &&
        (!belowCollection || item.id !== belowCollection.id)
      );
    },
    collect: (monitor: DropTargetMonitor<Collection, Collection>) => ({
      isCollectionDropping: monitor.isOver(),
      isDraggingAnyCollection: monitor.getItemType() === "collection",
    }),
  });

  // Drag to reorder collection
  const [{ isCollectionDragging }, dragToReorderCollection] = useDrag({
    type: "collection",
    item: () => {
      return {
        id: collection.id,
      };
    },
    collect: (monitor) => ({
      isCollectionDragging: monitor.isDragging(),
    }),
    canDrag: () => {
      return can.move;
    },
  });

  // If the current collection is active and relevant to the sidebar section we
  // are in then expand it automatically
  React.useEffect(() => {
    if (collection.id === ui.activeCollectionId && !locationStateStarred) {
      setExpanded(true);
    }
  }, [collection.id, ui.activeCollectionId, locationStateStarred]);

  const handleDisclosureClick = React.useCallback((ev) => {
    ev.preventDefault();
    setExpanded((e) => !e);
  }, []);

  const displayChildDocuments = expanded && !isCollectionDragging;

  return (
    <>
      <Draggable
        key={collection.id}
        ref={dragToReorderCollection}
        $isDragging={isCollectionDragging}
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
        <CollectionLinkChildren
          collection={collection}
          expanded={displayChildDocuments}
          prefetchDocument={prefetchDocument}
        />
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
  opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};
  pointer-events: ${(props) => (props.$isDragging ? "none" : "auto")};
`;

export default observer(DraggableCollectionLink);
