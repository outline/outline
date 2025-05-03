import fractionalIndex from "fractional-index";
import { Location } from "history";
import { observer } from "mobx-react";
import { StarredIcon } from "outline-icons";
import * as React from "react";
import { useEffect, useState } from "react";
import styled, { useTheme } from "styled-components";
import Star from "~/models/Star";
import Fade from "~/components/Fade";
import useBoolean from "~/hooks/useBoolean";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import {
  useDragStar,
  useDropToCreateStar,
  useDropToReorderStar,
} from "../hooks/useDragAndDrop";
import { useSidebarLabelAndIcon } from "../hooks/useSidebarLabelAndIcon";
import CollectionLink from "./CollectionLink";
import CollectionLinkChildren from "./CollectionLinkChildren";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import Relative from "./Relative";
import SidebarContext, {
  SidebarContextType,
  starredSidebarContext,
} from "./SidebarContext";
import SidebarLink from "./SidebarLink";

type Props = {
  star: Star;
};

function StarredLink({ star }: Props) {
  const theme = useTheme();
  const { ui, collections, documents } = useStores();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { documentId, collectionId } = star;
  const collection = collectionId ? collections.get(collectionId) : undefined;
  const locationSidebarContext = useLocationSidebarContext();
  const sidebarContext = starredSidebarContext(
    star.documentId ?? star.collectionId ?? ""
  );
  const [expanded, setExpanded] = useState(
    (star.documentId
      ? star.documentId === ui.activeDocumentId
      : star.collectionId === ui.activeCollectionId) &&
      sidebarContext === locationSidebarContext
  );

  React.useEffect(() => {
    if (
      star.documentId === ui.activeDocumentId &&
      sidebarContext === locationSidebarContext
    ) {
      setExpanded(true);
    } else if (
      star.collectionId === ui.activeCollectionId &&
      sidebarContext === locationSidebarContext
    ) {
      setExpanded(true);
    }
  }, [
    star.documentId,
    star.collectionId,
    ui.activeDocumentId,
    ui.activeCollectionId,
    sidebarContext,
    locationSidebarContext,
  ]);

  useEffect(() => {
    if (documentId) {
      void documents.fetch(documentId);
    }
  }, [documentId, documents]);

  const handleDisclosureClick = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded((prevExpanded) => !prevExpanded);
    },
    []
  );

  const handlePrefetch = React.useCallback(
    () => documentId && documents.prefetchDocument(documentId),
    [documents, documentId]
  );

  const getIndex = () => {
    const next = star?.next();
    return fractionalIndex(star?.index || null, next?.index || null);
  };
  const { label, icon } = useSidebarLabelAndIcon(
    star,
    <StarredIcon color={theme.yellow} />
  );
  const [{ isDragging }, draggableRef] = useDragStar(star);
  const [reorderStarProps, dropToReorderRef] = useDropToReorderStar(getIndex);
  const [createStarProps, dropToStarRef] = useDropToCreateStar(getIndex);

  const displayChildDocuments = expanded && !isDragging;

  const cursor = (
    <>
      {reorderStarProps.isDragging && (
        <DropCursor
          isActiveDrop={reorderStarProps.isOverCursor}
          innerRef={dropToReorderRef}
        />
      )}
      {createStarProps.isDragging && (
        <DropCursor
          isActiveDrop={createStarProps.isOverCursor}
          innerRef={dropToStarRef}
        />
      )}
    </>
  );

  if (documentId) {
    const document = documents.get(documentId);
    if (!document) {
      return null;
    }

    const collection = document.collectionId
      ? collections.get(document.collectionId)
      : undefined;
    const childDocuments = collection
      ? collection.getChildrenForDocument(documentId)
      : [];
    const hasChildDocuments = childDocuments.length > 0;

    return (
      <>
        <Draggable key={star.id} ref={draggableRef} $isDragging={isDragging}>
          <SidebarLink
            depth={0}
            to={{
              pathname: document.url,
              state: { sidebarContext },
            }}
            expanded={hasChildDocuments && !isDragging ? expanded : undefined}
            onDisclosureClick={handleDisclosureClick}
            onClickIntent={handlePrefetch}
            icon={icon}
            isActive={(
              match,
              location: Location<{ sidebarContext?: SidebarContextType }>
            ) => !!match && location.state?.sidebarContext === sidebarContext}
            label={label}
            exact={false}
            showActions={menuOpen}
            menu={
              document && !isDragging ? (
                <Fade>
                  <DocumentMenu
                    document={document}
                    onOpen={handleMenuOpen}
                    onClose={handleMenuClose}
                  />
                </Fade>
              ) : undefined
            }
          />
        </Draggable>
        <SidebarContext.Provider value={sidebarContext}>
          <Relative>
            <Folder expanded={displayChildDocuments}>
              {childDocuments.map((node, index) => (
                <DocumentLink
                  key={node.id}
                  node={node}
                  collection={collection}
                  activeDocument={documents.active}
                  prefetchDocument={documents.prefetchDocument}
                  isDraft={node.isDraft}
                  depth={2}
                  index={index}
                />
              ))}
            </Folder>
            {cursor}
          </Relative>
        </SidebarContext.Provider>
      </>
    );
  }

  if (collection) {
    return (
      <SidebarContext.Provider value={sidebarContext}>
        <Draggable key={star?.id} ref={draggableRef} $isDragging={isDragging}>
          <CollectionLink
            collection={collection}
            expanded={isDragging ? undefined : displayChildDocuments}
            activeDocument={documents.active}
            onDisclosureClick={handleDisclosureClick}
            isDraggingAnyCollection={reorderStarProps.isDragging}
          />
        </Draggable>
        <Relative>
          <CollectionLinkChildren
            collection={collection}
            expanded={displayChildDocuments}
          />
          {cursor}
        </Relative>
      </SidebarContext.Provider>
    );
  }

  return null;
}

const Draggable = styled.div<{ $isDragging?: boolean }>`
  position: relative;
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};
`;

export default observer(StarredLink);
