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
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import EmptyCollectionPlaceholder from "./EmptyCollectionPlaceholder";
import { DragObject } from "./SidebarLink";
import { useStarredContext } from "./StarredContext";
import useCollectionDocuments from "./useCollectionDocuments";

type Props = {
  collection: Collection;
  activeDocument: Document | undefined;
  prefetchDocument: (id: string) => Promise<Document | void>;
  belowCollection: Collection | void;
};

function CollectionLinkWithChildren({
  collection,
  activeDocument,
  prefetchDocument,
  belowCollection,
}: Props) {
  const location = useLocation<{
    starred?: boolean;
  }>();

  const { ui, documents, collections } = useStores();
  const [expanded, setExpanded] = React.useState(
    collection.id === ui.activeCollectionId
  );
  const inStarredSection = useStarredContext();

  const [openedOnce, setOpenedOnce] = React.useState(expanded);
  React.useEffect(() => {
    if (expanded) {
      setOpenedOnce(true);
    }
  }, [expanded]);

  const manualSort = collection.sort.field === "index";
  const can = usePolicy(collection.id);
  const belowCollectionIndex = belowCollection ? belowCollection.index : null;

  // Drop to reorder document
  const [{ isOverReorder }, dropToReorder] = useDrop({
    accept: "document",
    drop: (item: DragObject) => {
      if (!collection) {
        return;
      }
      documents.move(item.id, collection.id, undefined, 0);
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
    }),
  });

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

  React.useEffect(() => {
    if (
      collection.id === ui.activeCollectionId &&
      location.state?.starred === inStarredSection
    ) {
      setExpanded(true);
    }
  }, [collection.id, ui.activeCollectionId, location, inStarredSection]);

  const handleDisclosureClick = React.useCallback((ev) => {
    ev.preventDefault();
    setExpanded((e) => !e);
  }, []);

  const collectionDocuments = useCollectionDocuments(
    collection,
    activeDocument
  );
  const displayDocumentLinks = expanded && !isCollectionDragging;

  return (
    <>
      <Draggable
        key={collection.id}
        ref={dragToReorderCollection}
        $isDragging={isCollectionDragging}
        $isMoving={isCollectionDragging}
      >
        <CollectionLink
          collection={collection}
          expanded={displayDocumentLinks}
          activeDocument={activeDocument}
          onDisclosureClick={handleDisclosureClick}
          isDraggingAnyCollection={isDraggingAnyCollection}
        />
      </Draggable>
      <Relative>
        {openedOnce && (
          <Folder $open={displayDocumentLinks}>
            {manualSort && (
              <DropCursor
                isActiveDrop={isOverReorder}
                innerRef={dropToReorder}
                position="top"
              />
            )}
            {collectionDocuments.map((node, index) => (
              <DocumentLink
                key={node.id}
                node={node}
                collection={collection}
                activeDocument={activeDocument}
                prefetchDocument={prefetchDocument}
                isDraft={node.isDraft}
                depth={2}
                index={index}
              />
            ))}
            {collectionDocuments.length === 0 && <EmptyCollectionPlaceholder />}
          </Folder>
        )}
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

const Relative = styled.div`
  position: relative;
`;

const Folder = styled.div<{ $open?: boolean }>`
  display: ${(props) => (props.$open ? "block" : "none")};
`;

const Draggable = styled("div")<{ $isDragging: boolean; $isMoving: boolean }>`
  opacity: ${(props) => (props.$isDragging || props.$isMoving ? 0.5 : 1)};
  pointer-events: ${(props) => (props.$isMoving ? "none" : "auto")};
`;

export default observer(CollectionLinkWithChildren);
