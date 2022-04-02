import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop, useDrag, DropTargetMonitor } from "react-dnd";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import DocumentReparent from "~/scenes/DocumentReparent";
import Modal from "~/components/Modal";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import CollectionLink from "./CollectionLink";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import { DragObject } from "./SidebarLink";
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
  const { t } = useTranslation();
  const location = useLocation<{
    starred?: boolean;
  }>();
  const [
    permissionOpen,
    handlePermissionOpen,
    handlePermissionClose,
  ] = useBoolean();
  const itemRef = React.useRef<
    NavigationNode & { depth: number; active: boolean; collectionId: string }
  >();

  const { ui, documents, collections } = useStores();
  const [expanded, setExpanded] = React.useState(
    collection.id === ui.activeCollectionId
  );

  const [openedOnce, setOpenedOnce] = React.useState(expanded);
  React.useEffect(() => {
    if (expanded) {
      setOpenedOnce(true);
    }
  }, [expanded]);

  const manualSort = collection.sort.field === "index";
  const can = usePolicy(collection.id);
  const belowCollectionIndex = belowCollection ? belowCollection.index : null;

  // Drop to re-parent document
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "document",
    drop: (item: DragObject, monitor) => {
      const { id, collectionId } = item;
      if (monitor.didDrop()) {
        return;
      }
      if (!collection) {
        return;
      }

      const document = documents.get(id);
      if (collection.id === collectionId && !document?.parentDocumentId) {
        return;
      }

      const prevCollection = collections.get(collectionId);

      if (
        prevCollection &&
        prevCollection.permission === null &&
        prevCollection.permission !== collection.permission
      ) {
        itemRef.current = item;
        handlePermissionOpen();
      } else {
        documents.move(id, collection.id);
      }
    },
    canDrop: () => {
      return can.update;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver({
        shallow: true,
      }),
      canDrop: monitor.canDrop(),
    }),
  });

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
    if (collection.id === ui.activeCollectionId) {
      setExpanded(true);
    }
  }, [collection.id, ui.activeCollectionId, location]);

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
      <Relative ref={drop}>
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
            isActiveDrop={isOver && canDrop}
            isDraggingAnyCollection={isDraggingAnyCollection}
          />
        </Draggable>
      </Relative>
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
            {collectionDocuments.length === 0 && (
              <Empty type="tertiary" size="small">
                {t("Empty")}
              </Empty>
            )}
          </Folder>
        )}
        {isDraggingAnyCollection && (
          <DropCursor
            isActiveDrop={isCollectionDropping}
            innerRef={dropToReorderCollection}
          />
        )}
      </Relative>
      <Modal
        title={t("Move document")}
        onRequestClose={handlePermissionClose}
        isOpen={permissionOpen}
      >
        {itemRef.current && (
          <DocumentReparent
            item={itemRef.current}
            collection={collection}
            onSubmit={handlePermissionClose}
            onCancel={handlePermissionClose}
          />
        )}
      </Modal>
    </>
  );
}

const Empty = styled(Text)`
  margin-left: 46px;
  margin-bottom: 0;
  line-height: 34px;
  font-style: italic;
`;

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
