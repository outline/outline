import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import type * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { getEmptyImage } from "react-dnd-html5-backend";
import styled from "styled-components";
import type Collection from "~/models/Collection";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { useActiveSidebarContext } from "~/hooks/useActiveSidebarContext";
import { useComputed } from "~/hooks/useComputed";
import useStores from "~/hooks/useStores";
import { useDragRef, useDropRef } from "../hooks/useDragAndDrop";
import CollectionLink from "./CollectionLink";
import DropCursor from "./DropCursor";
import SidebarDisclosureContext, {
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";
import Relative from "./Relative";
import { useSidebarContext } from "./SidebarContext";

type Props = {
  collection: Collection;
  belowCollection: Collection | void;
};

interface CollectionDragItem {
  id: string;
  title: string;
  icon: React.ReactNode;
}

function DraggableCollectionLink({ collection, belowCollection }: Props) {
  const activeSidebarContext = useActiveSidebarContext() ?? "collections";
  const sidebarContext = useSidebarContext();
  const { ui, policies, collections } = useStores();
  // Computed so that only the collections that become active or inactive
  // re-render when navigating.
  const isActiveCollection = useComputed(
    () => collection.id === ui.activeCollectionId,
    [collection, ui]
  );
  const activeDocumentId = useComputed(
    () => (isActiveCollection ? ui.activeDocumentId : undefined),
    [isActiveCollection, ui]
  );
  const [expanded, setExpanded] = useState(
    isActiveCollection && sidebarContext === activeSidebarContext
  );
  const belowCollectionIndex = belowCollection ? belowCollection.index : null;

  // Context-based recursive expand/collapse for descendant DocumentLinks
  const { event: disclosureEvent, onDisclosureClick } =
    useSidebarDisclosureState();

  // Drop to reorder collection
  const [
    { isCollectionDropping, isDraggingAnyCollection },
    dropToReorderCollection,
  ] = useDropRef<
    CollectionDragItem,
    void,
    { isCollectionDropping: boolean; isDraggingAnyCollection: boolean }
  >({
    accept: "collection",
    drop: (item) => {
      void collections.move(
        item.id,
        fractionalIndex(collection.index, belowCollectionIndex)
      );
    },
    canDrop: (item) =>
      collection.id !== item.id &&
      (!belowCollection || item.id !== belowCollection.id) &&
      !!policies.abilities(item.id).move,
    collect: (monitor) => ({
      isCollectionDropping: monitor.isOver(),
      isDraggingAnyCollection: monitor.canDrop(),
    }),
  });

  // Drag to reorder collection
  const [{ isDragging }, dragToReorderCollection, preview] = useDragRef({
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
    if (isActiveCollection && sidebarContext === activeSidebarContext) {
      setExpanded(true);
    }
  }, [
    isActiveCollection,
    activeDocumentId,
    sidebarContext,
    activeSidebarContext,
  ]);

  const handleDisclosureClick = useCallback(
    (ev?: React.MouseEvent<HTMLElement>) => {
      ev?.preventDefault();
      setExpanded((e) => {
        const willExpand = !e;
        onDisclosureClick(willExpand, !!ev?.altKey);
        return willExpand;
      });
    },
    [onDisclosureClick]
  );

  const displayChildDocuments = expanded && !isDragging;

  return (
    <SidebarDisclosureContext.Provider value={disclosureEvent}>
      <Draggable
        key={collection.id}
        ref={dragToReorderCollection}
        $isDragging={isDragging}
      >
        <CollectionLink
          collection={collection}
          expanded={displayChildDocuments}
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
    </SidebarDisclosureContext.Provider>
  );
}

const Draggable = styled("div")<{ $isDragging: boolean }>`
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};
  pointer-events: ${(props) => (props.$isDragging ? "none" : "inherit")};
`;

export default observer(DraggableCollectionLink);
