import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useDrop, useDrag, DropTargetMonitor } from "react-dnd";
import { useTranslation } from "react-i18next";
import { useLocation, useHistory, Link } from "react-router-dom";
import styled from "styled-components";
import { sortNavigationNodes } from "@shared/utils/collections";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import DocumentReparent from "~/scenes/DocumentReparent";
import CollectionIcon from "~/components/CollectionIcon";
import Fade from "~/components/Fade";
import Modal from "~/components/Modal";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import CollectionMenu from "~/menus/CollectionMenu";
import { NavigationNode } from "~/types";
import { newDocumentPath } from "~/utils/routeHelpers";
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

  const displayDocumentLinks = expanded && !isCollectionDragging;

  React.useEffect(() => {
    // If we're viewing a starred document through the starred menu then don't
    // touch the expanded / collapsed state of the collections
    if (search === "?starred") {
      return;
    }

    if (collection.id === ui.activeCollectionId) {
      setExpanded(true);
    }
  }, [collection.id, ui.activeCollectionId, search]);

  return (
    <>
      <Relative ref={drop}>
        <Draggable
          key={collection.id}
          ref={dragToReorderCollection}
          $isDragging={isCollectionDragging}
          $isMoving={isCollectionDragging}
        >
          <DropToImport collectionId={collection.id}>
            <SidebarLink
              to={collection.url}
              expanded={displayDocumentLinks}
              onDisclosureClick={(event) => {
                event.preventDefault();
                setExpanded((prev) => !prev);
              }}
              icon={
                <CollectionIcon
                  collection={collection}
                  expanded={displayDocumentLinks}
                />
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
              depth={0}
              menu={
                !isEditing &&
                !isDraggingAnyCollection && (
                  <Fade>
                    {can.update && (
                      <Tooltip tooltip={t("New doc")} delay={500}>
                        <NudeButton
                          type={undefined}
                          aria-label={t("New document")}
                          as={Link}
                          to={newDocumentPath(collection.id)}
                        >
                          <PlusIcon />
                        </NudeButton>
                      </Tooltip>
                    )}
                    <CollectionMenu
                      collection={collection}
                      onOpen={handleMenuOpen}
                      onClose={handleMenuClose}
                    />
                  </Fade>
                )
              }
            />
          </DropToImport>
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
                canUpdate={canUpdate}
                isDraft={node.isDraft}
                depth={2}
                index={index}
              />
            ))}
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

export default observer(CollectionLink);
