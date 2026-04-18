import fractionalIndex from "fractional-index";
import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { UserPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type Star from "~/models/Star";
import type { RefHandle } from "~/components/EditableTitle";
import useBoolean from "~/hooks/useBoolean";
import { useCollectionMenuAction } from "~/hooks/useCollectionMenuAction";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import CollectionMenu from "~/menus/CollectionMenu";
import DocumentMenu from "~/menus/DocumentMenu";
import { documentEditPath } from "~/utils/routeHelpers";
import {
  useDragStar,
  useDropToChangeCollection,
  useDropToCreateStar,
  useDropToReorderStar,
} from "../hooks/useDragAndDrop";
import { useSidebarLabelAndIcon } from "../hooks/useSidebarLabelAndIcon";
import CollectionLinkChildren from "./CollectionLinkChildren";
import CollectionRow from "./CollectionRow";
import DocumentLink from "./DocumentLink";
import DocumentRow from "./DocumentRow";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import Relative from "./Relative";
import type { SidebarContextType } from "./SidebarContext";
import SidebarContext, { starredSidebarContext } from "./SidebarContext";
import SidebarDisclosureContext, {
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";

type Props = {
  star: Star;
};

type StarredDocumentLinkProps = {
  star: Star;
  document: Document;
  expanded: boolean;
  sidebarContext: SidebarContextType;
  handleDisclosureClick: (ev?: React.MouseEvent<HTMLElement>) => void;
  handlePrefetch: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  icon: React.ReactNode;
  menuOpen: boolean;
  handleMenuOpen: () => void;
  handleMenuClose: () => void;
  cursor: React.ReactNode;
};

type StarredCollectionLinkProps = {
  star: Star;
  collection: Collection;
  expanded: boolean;
  sidebarContext: SidebarContextType;
  handleDisclosureClick: (ev?: React.MouseEvent<HTMLElement>) => void;
  cursor: React.ReactNode;
  isDraggingAnyStar: boolean;
};

const StarredDocumentLink = observer(function StarredDocumentLink({
  star,
  document,
  expanded,
  sidebarContext,
  handleDisclosureClick,
  handlePrefetch,
  onExpand,
  onCollapse,
  icon,
  menuOpen,
  handleMenuOpen,
  handleMenuClose,
  cursor,
}: StarredDocumentLinkProps) {
  const history = useHistory();
  const user = useCurrentUser();
  const { collections, documents } = useStores();
  const can = usePolicy(document);
  const editableTitleRef = React.useRef<RefHandle>(null);
  const [{ isDragging }, draggableRef] = useDragStar(star);

  const documentCollection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const childDocuments = documentCollection
    ? documentCollection.getChildrenForDocument(document.id)
    : [];
  const hasChildDocuments = childDocuments.length > 0;
  const displayChildDocuments = expanded && !isDragging;

  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);

  const handleTitleChange = React.useCallback(
    async (value: string) => {
      if (!document) {
        return;
      }
      await documents.update({
        id: document.id,
        title: value,
      });
    },
    [documents, document]
  );

  const handleNewDoc = React.useCallback(
    async (input: string) => {
      if (!document) {
        return;
      }
      const newDocument = await documents.create(
        {
          collectionId: documentCollection?.id,
          parentDocumentId: document.id,
          fullWidth:
            document.fullWidth ??
            user.getPreference(UserPreference.FullWidthDocuments),
          title: input,
          data: ProsemirrorHelper.getEmptyDocument(),
        },
        { publish: true }
      );
      documentCollection?.addDocument(newDocument, document.id);
      history.push({
        pathname: documentEditPath(newDocument),
        state: { sidebarContext },
      });
    },
    [documents, document, documentCollection, sidebarContext, user, history]
  );

  const contextMenuAction = useDocumentMenuAction({
    documentId: document.id,
    onRename: handleRename,
  });

  const isActive = React.useCallback(
    (match, location: Location<{ sidebarContext?: SidebarContextType }>) => {
      if (location.state?.sidebarContext !== sidebarContext) {
        return false;
      }
      return (
        !!match || (!!document && location.pathname.endsWith(document.urlId))
      );
    },
    [sidebarContext, document]
  );

  const menu = (
    <DocumentMenu
      document={document}
      onRename={handleRename}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  );

  return (
    <Draggable ref={draggableRef} $isDragging={isDragging}>
      <DocumentRow
        documentId={document.id}
        document={document}
        to={{ pathname: document.path, state: { sidebarContext } }}
        depth={0}
        icon={icon}
        canEdit={can.update}
        labelText={document.titleWithDefault}
        onTitleChange={handleTitleChange}
        editableTitleRef={editableTitleRef}
        expanded={expanded}
        hasChildren={hasChildDocuments}
        onDisclosureClick={handleDisclosureClick}
        onExpand={onExpand}
        onCollapse={onCollapse}
        isDragging={isDragging}
        menu={menu}
        menuOpen={menuOpen}
        canCreateChild={can.createChildDocument}
        onCreateChild={handleNewDoc}
        newChildDepth={2}
        contextAction={contextMenuAction}
        isActiveOverride={isActive}
        onClickIntent={handlePrefetch}
      >
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
                  parentId={document.id}
                />
              ))}
            </Folder>
            {cursor}
          </Relative>
        </SidebarContext.Provider>
      </DocumentRow>
    </Draggable>
  );
});

const StarredCollectionLink = observer(function StarredCollectionLink({
  star,
  collection,
  expanded,
  sidebarContext,
  handleDisclosureClick,
  cursor,
  isDraggingAnyStar,
}: StarredCollectionLinkProps) {
  const { documents } = useStores();
  const history = useHistory();
  const user = useCurrentUser();
  const can = usePolicy(collection.id);
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const editableTitleRef = React.useRef<RefHandle>(null);
  const [{ isDragging }, draggableRef] = useDragStar(star);
  const displayChildDocuments = expanded && !isDragging;

  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await collection.save({ name });
    },
    [collection]
  );

  const handleExpand = React.useCallback(() => {
    if (!displayChildDocuments) {
      handleDisclosureClick();
    }
  }, [displayChildDocuments, handleDisclosureClick]);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, dropRef] = useDropToChangeCollection(
    collection,
    handleExpand,
    parentRef
  );

  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);

  const handlePrefetch = React.useCallback(() => {
    void collection.fetchDocuments();
  }, [collection]);

  const handleNewDoc = React.useCallback(
    async (input: string) => {
      const newDocument = await documents.create(
        {
          collectionId: collection.id,
          title: input,
          fullWidth: user.getPreference(UserPreference.FullWidthDocuments),
          data: ProsemirrorHelper.getEmptyDocument(),
        },
        { publish: true }
      );
      collection?.addDocument(newDocument);
      history.push({
        pathname: documentEditPath(newDocument),
        state: { sidebarContext },
      });
    },
    [user, sidebarContext, history, collection, documents]
  );

  const contextMenuAction = useCollectionMenuAction({
    collectionId: collection.id,
    onRename: handleRename,
  });

  const menu = !isDraggingAnyStar ? (
    <CollectionMenu
      collection={collection}
      onRename={handleRename}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  ) : undefined;

  return (
    <SidebarContext.Provider value={sidebarContext}>
      <Draggable ref={draggableRef} $isDragging={isDragging}>
        <CollectionRow
          collection={collection}
          to={{ pathname: collection.path, state: { sidebarContext } }}
          expanded={isDragging ? undefined : displayChildDocuments}
          onDisclosureClick={handleDisclosureClick}
          onExpand={handleExpand}
          onClickIntent={handlePrefetch}
          canEdit={can.update}
          labelText={collection.name}
          onTitleChange={handleTitleChange}
          editableTitleRef={editableTitleRef}
          contextAction={contextMenuAction}
          menu={menu}
          menuOpen={menuOpen}
          canCreateChild={!isDraggingAnyStar && can.createDocument}
          onCreateChild={handleNewDoc}
          parentRef={parentRef}
          dropRef={dropRef}
          isActiveDropTarget={isOver && canDrop}
        >
          <CollectionLinkChildren
            collection={collection}
            expanded={displayChildDocuments}
            prefetchDocument={documents.prefetchDocument}
          />
        </CollectionRow>
      </Draggable>
      <Relative>{cursor}</Relative>
    </SidebarContext.Provider>
  );
});

function StarredLink({ star }: Props) {
  const { ui, collections, documents } = useStores();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { documentId, collectionId } = star;
  const collection = collectionId ? collections.get(collectionId) : undefined;
  const document = documentId ? documents.get(documentId) : undefined;
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

  const handleExpand = React.useCallback(() => {
    setExpanded(true);
  }, []);

  const handleCollapse = React.useCallback(() => {
    setExpanded(false);
  }, []);

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
  const { icon } = useSidebarLabelAndIcon(star);
  const [reorderStarProps, dropToReorderRef] = useDropToReorderStar(getIndex);
  const [createStarProps, dropToStarRef] = useDropToCreateStar(getIndex);

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

  if (document) {
    return (
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
        <StarredDocumentLink
          star={star}
          document={document}
          expanded={expanded}
          sidebarContext={sidebarContext}
          handleDisclosureClick={handleDisclosureClick}
          handlePrefetch={handlePrefetch}
          onExpand={handleExpand}
          onCollapse={handleCollapse}
          icon={icon}
          menuOpen={menuOpen}
          handleMenuOpen={handleMenuOpen}
          handleMenuClose={handleMenuClose}
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
          handleDisclosureClick={handleDisclosureClick}
          cursor={cursor}
          isDraggingAnyStar={reorderStarProps.isDragging}
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
