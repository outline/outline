import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop, useDrag } from "react-dnd";
import { useTranslation } from "react-i18next";
import { useLocation, useHistory } from "react-router-dom";
import styled from "styled-components";
import { sortNavigationNodes } from "@shared/utils/collections";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import DocumentReparent from "~/scenes/DocumentReparent";
import CollectionIcon from "~/components/CollectionIcon";
import Modal from "~/components/Modal";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import CollectionMenu from "~/menus/CollectionMenu";
import CollectionSortMenu from "~/menus/CollectionSortMenu";
import { NavigationNode } from "~/types";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import DropToImport from "./DropToImport";
import EditableTitle from "./EditableTitle";
import SidebarLink, { DragObject } from "./SidebarLink";

type Props = {
  collection: Collection;
  canUpdate: boolean;
  activeDocument: Document | null | undefined;
  prefetchDocument: (id: string) => Promise<Document | void>;
  belowCollection: Collection | void;
};

function CollectionLink({
  collection,
  activeDocument,
  prefetchDocument,
  canUpdate,
  belowCollection,
}: Props) {
  const history = useHistory();
  const { t } = useTranslation();
  const { search } = useLocation();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const [
    permissionOpen,
    handlePermissionOpen,
    handlePermissionClose,
  ] = useBoolean();
  const itemRef = React.useRef<
    NavigationNode & { depth: number; active: boolean; collectionId: string }
  >();
  const [isEditing, setIsEditing] = React.useState(false);

  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await collection.save({
        name,
      });
      history.push(collection.url);
    },
    [collection, history]
  );

  const handleTitleEditing = React.useCallback((isEditing: boolean) => {
    setIsEditing(isEditing);
  }, []);

  const { ui, documents, collections } = useStores();
  const [expanded, setExpanded] = React.useState(
    collection.id === ui.activeCollectionId
  );

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
    drop: async (item: DragObject) => {
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
    { isCollectionDropping, isDraggingAnotherCollection },
    dropToReorderCollection,
  ] = useDrop({
    accept: "collection",
    drop: async (item: DragObject) => {
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
    collect: (monitor) => ({
      isCollectionDropping: monitor.isOver(),
      isDraggingAnotherCollection: monitor.canDrop(),
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

  const collectionDocuments = React.useMemo(() => {
    if (
      activeDocument?.isActive &&
      activeDocument?.isDraft &&
      activeDocument?.collectionId === collection.id &&
      !activeDocument?.parentDocumentId
    ) {
      return sortNavigationNodes(
        [activeDocument.asNavigationNode, ...collection.documents],
        collection.sort
      );
    }

    return collection.documents;
  }, [
    activeDocument?.isActive,
    activeDocument?.isDraft,
    activeDocument?.collectionId,
    activeDocument?.parentDocumentId,
    activeDocument?.asNavigationNode,
    collection.documents,
    collection.id,
    collection.sort,
  ]);

  const isDraggingAnyCollection =
    isDraggingAnotherCollection || isCollectionDragging;

  React.useEffect(() => {
    // If we're viewing a starred document through the starred menu then don't
    // touch the expanded / collapsed state of the collections
    if (search === "?starred") {
      return;
    }

    if (isDraggingAnyCollection) {
      setExpanded(false);
    } else {
      setExpanded(collection.id === ui.activeCollectionId);
    }
  }, [isDraggingAnyCollection, collection.id, ui.activeCollectionId, search]);

  return (
    <>
      <div
        ref={drop}
        style={{
          position: "relative",
        }}
      >
        <Draggable
          key={collection.id}
          ref={dragToReorderCollection}
          $isDragging={isCollectionDragging}
          $isMoving={isCollectionDragging}
        >
          <DropToImport collectionId={collection.id}>
            <SidebarLink
              to={collection.url}
              icon={
                <CollectionIcon collection={collection} expanded={expanded} />
              }
              showActions={menuOpen}
              isActiveDrop={isOver && canDrop}
              label={
                <EditableTitle
                  title={collection.name}
                  onSubmit={handleTitleChange}
                  onEditing={handleTitleEditing}
                  canUpdate={canUpdate}
                />
              }
              exact={false}
              depth={0.5}
              menu={
                !isEditing && (
                  <>
                    {can.update && (
                      <CollectionSortMenuWithMargin
                        collection={collection}
                        onOpen={handleMenuOpen}
                        onClose={handleMenuClose}
                      />
                    )}
                    <CollectionMenu
                      collection={collection}
                      onOpen={handleMenuOpen}
                      onClose={handleMenuClose}
                    />
                  </>
                )
              }
            />
          </DropToImport>
        </Draggable>
        {expanded && manualSort && (
          <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
        )}
        {isDraggingAnyCollection && (
          <DropCursor
            isActiveDrop={isCollectionDropping}
            innerRef={dropToReorderCollection}
          />
        )}
      </div>
      {expanded &&
        collectionDocuments.map((node, index) => (
          <DocumentLink
            key={node.id}
            node={node}
            collection={collection}
            activeDocument={activeDocument}
            prefetchDocument={prefetchDocument}
            canUpdate={canUpdate}
            isDraft={node.isDraft}
            depth={2}
            index={index}
          />
        ))}
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

const Draggable = styled("div")<{ $isDragging: boolean; $isMoving: boolean }>`
  opacity: ${(props) => (props.$isDragging || props.$isMoving ? 0.5 : 1)};
  pointer-events: ${(props) => (props.$isMoving ? "none" : "auto")};
`;

const CollectionSortMenuWithMargin = styled(CollectionSortMenu)`
  margin-right: 4px;
`;

export default observer(CollectionLink);
