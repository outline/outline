// @flow
import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop, useDrag } from "react-dnd";
import styled from "styled-components";
import Collection from "models/Collection";
import Document from "models/Document";
import CollectionIcon from "components/CollectionIcon";
import DropToImport from "components/DropToImport";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import EditableTitle from "./EditableTitle";
import SidebarLink from "./SidebarLink";
import useStores from "hooks/useStores";
import CollectionMenu from "menus/CollectionMenu";
import CollectionSortMenu from "menus/CollectionSortMenu";

type Props = {|
  collection: Collection,
  canUpdate: boolean,
  activeDocument: ?Document,
  prefetchDocument: (id: string) => Promise<void>,
  belowCollection: Collection | void,
  isDraggingAnyCollection: boolean,
  onChangeDragging: (dragging: boolean) => void,
|};

function CollectionLink({
  collection,
  activeDocument,
  prefetchDocument,
  canUpdate,
  belowCollection,
  isDraggingAnyCollection,
  onChangeDragging,
}: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await collection.save({ name });
    },
    [collection]
  );

  const { ui, documents, policies, collections } = useStores();

  const [expanded, setExpanded] = React.useState(
    collection.id === ui.activeCollectionId
  );

  React.useEffect(() => {
    if (isDraggingAnyCollection) {
      setExpanded(false);
    } else {
      setExpanded(collection.id === ui.activeCollectionId);
    }
  }, [isDraggingAnyCollection, collection.id, ui.activeCollectionId]);

  const manualSort = collection.sort.field === "index";
  const can = policies.abilities(collection.id);
  const belowCollectionIndex = belowCollection ? belowCollection.index : null;

  // Drop to re-parent
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "document",
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;
      if (!collection) return;
      documents.move(item.id, collection.id);
    },
    canDrop: (item, monitor) => {
      return policies.abilities(collection.id).update;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  // Drop to reorder
  const [{ isOverReorder }, dropToReorder] = useDrop({
    accept: "document",
    drop: async (item, monitor) => {
      if (!collection) return;
      documents.move(item.id, collection.id, undefined, 0);
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
    }),
  });

  // Drop to reorder Collection
  const [{ isCollectionDropping }, dropToReorderCollection] = useDrop({
    accept: "collection",
    drop: async (item, monitor) => {
      collections.move(
        item.id,
        fractionalIndex(collection.index, belowCollectionIndex)
      );
    },
    canDrop: (item, monitor) => {
      return (
        collection.id !== item.id &&
        (!belowCollection || item.id !== belowCollection.id)
      );
    },
    collect: (monitor) => ({
      isCollectionDropping: monitor.isOver(),
    }),
  });

  // Drag to reorder Collection
  const [{ isCollectionDragging }, dragToReorderCollection] = useDrag({
    type: "collection",
    item: () => {
      onChangeDragging(true);
      return {
        id: collection.id,
      };
    },
    collect: (monitor) => ({
      isCollectionDragging: monitor.isDragging(),
    }),
    canDrag: (monitor) => {
      return can.move;
    },
    end: (monitor) => {
      onChangeDragging(false);
    },
  });

  return (
    <>
      <div ref={drop} style={{ position: "relative" }}>
        <Draggable
          key={collection.id}
          ref={dragToReorderCollection}
          $isDragging={isCollectionDragging}
          $isMoving={isCollectionDragging}
        >
          <DropToImport collectionId={collection.id}>
            <SidebarLinkWithPadding
              to={collection.url}
              icon={
                <CollectionIcon collection={collection} expanded={expanded} />
              }
              iconColor={collection.color}
              expanded={expanded}
              showActions={menuOpen || expanded}
              isActiveDrop={isOver && canDrop}
              label={
                <EditableTitle
                  title={collection.name}
                  onSubmit={handleTitleChange}
                  canUpdate={canUpdate}
                />
              }
              exact={false}
              menu={
                <>
                  {can.update && (
                    <CollectionSortMenuWithMargin
                      collection={collection}
                      onOpen={() => setMenuOpen(true)}
                      onClose={() => setMenuOpen(false)}
                    />
                  )}
                  <CollectionMenu
                    collection={collection}
                    onOpen={() => setMenuOpen(true)}
                    onClose={() => setMenuOpen(false)}
                  />
                </>
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
        collection.documents.map((node, index) => (
          <DocumentLink
            key={node.id}
            node={node}
            collection={collection}
            activeDocument={activeDocument}
            prefetchDocument={prefetchDocument}
            canUpdate={canUpdate}
            depth={1.5}
            index={index}
          />
        ))}
    </>
  );
}

const Draggable = styled("div")`
  opacity: ${(props) => (props.$isDragging || props.$isMoving ? 0.5 : 1)};
  pointer-events: ${(props) => (props.$isMoving ? "none" : "auto")};
`;

const SidebarLinkWithPadding = styled(SidebarLink)`
  padding-right: 60px;
`;

const CollectionSortMenuWithMargin = styled(CollectionSortMenu)`
  margin-right: 4px;
`;

export default observer(CollectionLink);
