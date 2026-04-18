import fractionalIndex from "fractional-index";
import type { Location } from "history";
import { observer } from "mobx-react";
import { PlusIcon, StarredIcon } from "outline-icons";
import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import { UserPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { DocumentValidation } from "@shared/validations";
import type Star from "~/models/Star";
import EditableTitle, { type RefHandle } from "~/components/EditableTitle";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import { documentEditPath } from "~/utils/routeHelpers";
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
  onExpand: () => void;
  icon: React.ReactNode;
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
  onExpand,
  icon,
  menuOpen,
  handleMenuOpen,
  handleMenuClose,
  draggableRef,
  cursor,
}: StarredDocumentLinkProps) {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useCurrentUser();
  const { collections, documents } = useStores();
  const can = usePolicy(documentId);

  const document = documents.get(documentId);

  const documentCollection = document?.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const childDocuments = documentCollection
    ? documentCollection.getChildrenForDocument(documentId)
    : [];
  const hasChildDocuments = childDocuments.length > 0;
  const displayChildDocuments = expanded && !isDragging;

  const [isEditing, setIsEditing] = React.useState(false);
  const editableTitleRef = React.useRef<RefHandle>(null);
  const [isAddingNewChild, setIsAddingNewChild, closeAddingNewChild] =
    useBoolean();
  const newChildTitleRef = React.useRef<RefHandle>(null);

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
      try {
        newChildTitleRef.current?.setIsEditing(false);
        const newDocument = await documents.create(
          {
            collectionId: documentCollection?.id,
            parentDocumentId: documentId,
            fullWidth:
              document.fullWidth ??
              user.getPreference(UserPreference.FullWidthDocuments),
            title: input,
            data: ProsemirrorHelper.getEmptyDocument(),
          },
          { publish: true }
        );
        documentCollection?.addDocument(newDocument, documentId);

        closeAddingNewChild();
        history.push({
          pathname: documentEditPath(newDocument),
          state: { sidebarContext },
        });
      } catch (_err) {
        newChildTitleRef.current?.setIsEditing(true);
      }
    },
    [
      documents,
      document,
      documentCollection,
      documentId,
      sidebarContext,
      user,
      history,
      closeAddingNewChild,
    ]
  );

  const contextMenuAction = useDocumentMenuAction({
    documentId,
    onRename: handleRename,
  });

  if (!document) {
    return null;
  }

  const labelElement = (
    <EditableTitle
      title={document.titleWithDefault}
      onSubmit={handleTitleChange}
      isEditing={isEditing}
      onEditing={setIsEditing}
      canUpdate={can.update}
      maxLength={DocumentValidation.maxTitleLength}
      ref={editableTitleRef}
    />
  );

  const menuElement =
    !isDragging && !isEditing ? (
      <Fade>
        {can.createChildDocument && (
          <Tooltip content={t("New doc")}>
            <NudeButton
              aria-label={t("New nested document")}
              onClick={(ev) => {
                ev.preventDefault();
                setIsAddingNewChild();
                onExpand();
              }}
            >
              <PlusIcon />
            </NudeButton>
          </Tooltip>
        )}
        <DocumentMenu
          document={document}
          onRename={handleRename}
          onOpen={handleMenuOpen}
          onClose={handleMenuClose}
        />
      </Fade>
    ) : undefined;

  return (
    <ActionContextProvider
      value={{
        activeModels: [document],
      }}
    >
      <Draggable key={star.id} ref={draggableRef} $isDragging={isDragging}>
        <SidebarLink
          // @ts-expect-error react-router type is wrong, string component is fine.
          component={isEditing ? "div" : undefined}
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
          label={labelElement}
          ellipsis={!isEditing}
          exact={false}
          $showActions={menuOpen}
          menu={menuElement}
        />
      </Draggable>
      {isAddingNewChild && (
        <SidebarLink
          isActive={() => true}
          depth={2}
          ellipsis={false}
          label={
            <EditableTitle
              title=""
              canUpdate
              isEditing
              placeholder={`${t("New doc")}…`}
              onCancel={closeAddingNewChild}
              onSubmit={handleNewDoc}
              maxLength={DocumentValidation.maxTitleLength}
              ref={newChildTitleRef}
            />
          }
        />
      )}
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

  const handleExpand = React.useCallback(() => {
    setExpanded(true);
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
  const { icon } = useSidebarLabelAndIcon(
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
          onExpand={handleExpand}
          icon={icon}
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
