import fractionalIndex from "fractional-index";
import type { Location } from "history";
import { observer } from "mobx-react";
import { StarredIcon } from "outline-icons";
import * as React from "react";
import { useEffect, useState } from "react";
import styled, { useTheme } from "styled-components";
import type Star from "~/models/Star";
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
import DocumentLink from "./DocumentLink";
import SidebarDisclosureContext, {
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import Relative from "./Relative";
import type { SidebarContextType } from "./SidebarContext";
import SidebarContext, { starredSidebarContext } from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import { type ConnectDragSource } from "react-dnd";

type Props = {
  star: Star;
};

type StarredDocumentLinkProps = {
  star: Star;
  documentId: string;
  expanded: boolean;
  sidebarContext: SidebarContextType;
  isDragging: boolean;
  handleDisclosureClick: React.MouseEventHandler<HTMLElement>;
  handlePrefetch: () => void;
  icon: React.ReactNode;
  label: React.ReactNode;
  menuOpen: boolean;
  handleMenuOpen: () => void;
  handleMenuClose: () => void;
  draggableRef: ConnectDragSource;
  cursor: React.ReactNode;
};

type StarredCollectionLinkProps = {
  star: Star;
  collection: any;
  expanded: boolean;
  sidebarContext: SidebarContextType;
  isDragging: boolean;
  handleDisclosureClick: (ev?: React.MouseEvent<HTMLButtonElement>) => void;
  draggableRef: ConnectDragSource;
  cursor: React.ReactNode;
  displayChildDocuments: boolean;
  reorderStarProps: any;
};

const StarredDocumentLink = observer(function StarredDocumentLink({
  star,
  documentId,
  expanded,
  sidebarContext,
  isDragging,
  handleDisclosureClick,
  handlePrefetch,
  icon,
  label,
  menuOpen,
  handleMenuOpen,
  handleMenuClose,
  draggableRef,
  cursor,
}: StarredDocumentLinkProps) {
  const { collections, documents } = useStores();

  const document = documents.get(documentId);

  const documentCollection = document?.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const childDocuments = documentCollection
    ? documentCollection.getChildrenForDocument(documentId)
    : [];
  const hasChildDocuments = childDocuments.length > 0;
  const displayChildDocuments = expanded && !isDragging;
  const contextMenuAction = useDocumentMenuAction({ documentId });

  if (!document) {
    return null;
  }

  return (
    <ActionContextProvider
      value={{
        activeDocumentId: document.id,
      }}
    >
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
          contextAction={contextMenuAction}
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
                collection={documentCollection}
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
    </ActionContextProvider>
  );
});

const StarredCollectionLink = observer(function StarredCollectionLink({
  star,
  collection,
  sidebarContext,
  isDragging,
  handleDisclosureClick,
  draggableRef,
  cursor,
  displayChildDocuments,
  reorderStarProps,
}: StarredCollectionLinkProps) {
  const { documents } = useStores();

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
      <Relative>{cursor}</Relative>
    </SidebarContext.Provider>
  );
});

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

  const { event: disclosureEvent, onDisclosureClick } =
    useSidebarDisclosureState();

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
    (ev?: React.MouseEvent<HTMLElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      setExpanded((prevExpanded) => {
        const willExpand = !prevExpanded;
        onDisclosureClick(willExpand, !!ev?.altKey);
        return willExpand;
      });
    },
    [onDisclosureClick]
  );

  const handlePrefetch = React.useCallback(() => {
    if (documentId) {
      void documents.prefetchDocument(documentId);
      const document = documents.get(documentId);
      const documentCollection = document?.collectionId
        ? collections.get(document.collectionId)
        : undefined;
      void documentCollection?.fetchDocuments();
    }
  }, [documents, documentId, collections]);

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
    return (
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
        <StarredDocumentLink
          star={star}
          documentId={documentId}
          expanded={expanded}
          sidebarContext={sidebarContext}
          isDragging={isDragging}
          handleDisclosureClick={handleDisclosureClick}
          handlePrefetch={handlePrefetch}
          icon={icon}
          label={label}
          menuOpen={menuOpen}
          handleMenuOpen={handleMenuOpen}
          handleMenuClose={handleMenuClose}
          draggableRef={draggableRef}
          cursor={cursor}
        />
      </SidebarDisclosureContext.Provider>
    );
  }

  if (collection) {
    return (
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
        <StarredCollectionLink
          star={star}
          collection={collection}
          expanded={expanded}
          sidebarContext={sidebarContext}
          isDragging={isDragging}
          handleDisclosureClick={handleDisclosureClick}
          draggableRef={draggableRef}
          cursor={cursor}
          displayChildDocuments={displayChildDocuments}
          reorderStarProps={reorderStarProps}
        />
      </SidebarDisclosureContext.Provider>
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
