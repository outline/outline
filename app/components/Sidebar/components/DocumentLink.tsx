import type { Location } from "history";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import { UserPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { sortNavigationNodes } from "@shared/utils/collections";
import { DocumentValidation } from "@shared/validations";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type { RefHandle } from "~/components/EditableTitle";
import EditableTitle from "~/components/EditableTitle";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import { documentEditPath } from "~/utils/routeHelpers";
import {
  useDragDocument,
  useDropToReorderDocument,
  useDropToReparentDocument,
} from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import DropToImport from "./DropToImport";
import Folder from "./Folder";
import Relative from "./Relative";
import type { SidebarContextType } from "./SidebarContext";
import { useSidebarContext } from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import type UserMembership from "~/models/UserMembership";
import type GroupMembership from "~/models/GroupMembership";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import SidebarDisclosureContext, {
  useSidebarDisclosure,
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";

type Props = {
  node: NavigationNode;
  collection?: Collection;
  membership?: UserMembership | GroupMembership;
  activeDocument: Document | null | undefined;
  prefetchDocument?: (documentId: string) => Promise<Document | void>;
  isDraft?: boolean;
  depth: number;
  index: number;
  parentId?: string;
};

function InnerDocumentLink(
  {
    node,
    collection,
    membership,
    activeDocument,
    prefetchDocument,
    isDraft,
    depth,
    index,
    parentId,
  }: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const { documents, policies } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const canUpdate = usePolicy(node.id).update;
  const isActiveDocument = activeDocument && activeDocument.id === node.id;
  const hasChildDocuments =
    !!node.children.length || activeDocument?.parentDocumentId === node.id;
  const document = documents.get(node.id);
  const { fetchChildDocuments } = documents;
  const [isEditing, setIsEditing] = React.useState(false);
  const editableTitleRef = React.useRef<RefHandle>(null);
  const sidebarContext = useSidebarContext();
  const user = useCurrentUser();

  React.useEffect(() => {
    if (
      isActiveDocument &&
      (hasChildDocuments || sidebarContext !== "collections")
    ) {
      void fetchChildDocuments(node.id);
    }
  }, [
    fetchChildDocuments,
    node.id,
    hasChildDocuments,
    sidebarContext,
    isActiveDocument,
  ]);

  const showChildren = React.useMemo(() => {
    if (!hasChildDocuments || !activeDocument) {
      return false;
    }

    const pathToDocument =
      collection?.pathToDocument(activeDocument.id) ??
      membership?.pathToDocument(activeDocument.id);

    return !!(
      pathToDocument?.some((entry) => entry.id === node.id) || isActiveDocument
    );
  }, [
    hasChildDocuments,
    activeDocument,
    isActiveDocument,
    node,
    collection,
    membership,
  ]);

  const [expanded, setExpanded, setCollapsed] = useBoolean(showChildren);

  // Context-based recursive expand/collapse for descendant DocumentLinks
  const { event: disclosureEvent, onDisclosureClick } =
    useSidebarDisclosureState();

  // Subscribe to recursive expand/collapse events from an ancestor
  useSidebarDisclosure(setExpanded, setCollapsed);

  React.useEffect(() => {
    if (showChildren) {
      setExpanded();
    }
  }, [setExpanded, showChildren]);

  // when the last child document is removed auto-close the local folder state
  React.useEffect(() => {
    if (expanded && !hasChildDocuments) {
      setCollapsed();
    }
  }, [setCollapsed, expanded, hasChildDocuments]);

  const handleDisclosureClick = React.useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      const willExpand = !expanded;
      if (willExpand) {
        setExpanded();
      } else {
        setCollapsed();
      }
      onDisclosureClick(willExpand, ev.altKey);
    },
    [setCollapsed, setExpanded, expanded, onDisclosureClick]
  );

  const handlePrefetch = React.useCallback(() => {
    void prefetchDocument?.(node.id);
  }, [prefetchDocument, node]);

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
  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);

  const toPath = React.useMemo(
    () => ({
      pathname: node.url,
      state: {
        title: node.title,
        sidebarContext,
      },
    }),
    [node.url, node.title, sidebarContext]
  );

  const isActiveCheck = React.useCallback(
    (
      match,
      location: Location<{
        sidebarContext?: SidebarContextType;
      }>
    ) => {
      if (sidebarContext !== location.state?.sidebarContext) {
        return false;
      }
      return (
        (document && location.pathname.endsWith(document.urlId)) || !!match
      );
    },
    [sidebarContext, document]
  );

  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const isMoving = documents.movingDocumentId === node.id;
  const can = policies.abilities(node.id);
  const icon = document?.icon || node.icon || node.emoji;
  const color = document?.color || node.color;
  const initial = document?.initial || node.title.charAt(0).toUpperCase();

  const iconElement = React.useMemo(
    () =>
      icon ? <Icon value={icon} color={color} initial={initial} /> : undefined,
    [icon, color]
  );

  // Draggable
  const [{ isDragging }, drag] = useDragDocument(
    node,
    depth,
    document,
    isEditing
  );

  // Drop to re-parent
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [{ isOverReparent, canDropToReparent }, dropToReparent] =
    useDropToReparentDocument(node, setExpanded, parentRef);

  // Drop to reorder
  const [{ isOverReorder: isOverReorderAbove }, dropToReorderAbove] =
    useDropToReorderDocument(node, collection, (item) => {
      if (!collection) {
        return;
      }
      return {
        documentId: item.id,
        collectionId: collection.id,
        parentDocumentId: parentId,
        index,
      };
    });

  const [{ isOverReorder, isDraggingAnyDocument }, dropToReorder] =
    useDropToReorderDocument(node, collection, (item) => {
      if (!collection) {
        return;
      }
      if (expanded) {
        return {
          documentId: item.id,
          collectionId: collection.id,
          parentDocumentId: node.id,
          index: 0,
        };
      }
      return {
        documentId: item.id,
        collectionId: collection.id,
        parentDocumentId: parentId,
        index: index + 1,
      };
    });

  const nodeChildren = React.useMemo(() => {
    const insertDraftDocument =
      activeDocument?.isDraft &&
      activeDocument?.isActive &&
      activeDocument?.parentDocumentId === node.id;

    return collection && insertDraftDocument
      ? sortNavigationNodes(
          [activeDocument?.asNavigationNode, ...node.children],
          collection.sort,
          false
        )
      : node.children;
  }, [
    activeDocument?.isActive,
    activeDocument?.isDraft,
    activeDocument?.parentDocumentId,
    activeDocument?.asNavigationNode,
    collection,
    node,
  ]);

  const doc = documents.get(node.id);
  const title = doc?.title || node.title || t("Untitled");

  const isExpanded = expanded && !isDragging;
  const hasChildren = nodeChildren.length > 0;

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent) => {
      if (!hasChildren) {
        return;
      }
      if (ev.key === "ArrowRight" && !expanded) {
        setExpanded();
      }
      if (ev.key === "ArrowLeft" && expanded) {
        setCollapsed();
      }
    },
    [setExpanded, setCollapsed, hasChildren, expanded]
  );

  const newChildTitleRef = React.useRef<RefHandle>(null);
  const [isAddingNewChild, setIsAddingNewChild, closeAddingNewChild] =
    useBoolean();

  const handleNewDoc = React.useCallback(
    async (input) => {
      try {
        newChildTitleRef.current?.setIsEditing(false);
        const newDocument = await documents.create(
          {
            collectionId: collection?.id,
            parentDocumentId: node.id,
            fullWidth:
              doc?.fullWidth ??
              user.getPreference(UserPreference.FullWidthDocuments),
            title: input,
            data: ProsemirrorHelper.getEmptyDocument(),
          },
          { publish: true }
        );
        collection?.addDocument(newDocument, node.id);
        membership?.addDocument(newDocument, node.id);

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
      collection,
      sidebarContext,
      user,
      node,
      doc,
      history,
      closeAddingNewChild,
    ]
  );

  const contextMenuAction = useDocumentMenuAction({
    documentId: node.id,
    onRename: handleRename,
  });

  const labelElement = React.useMemo(
    () => (
      <EditableTitle
        title={title}
        onSubmit={handleTitleChange}
        isEditing={isEditing}
        onEditing={setIsEditing}
        canUpdate={canUpdate}
        maxLength={DocumentValidation.maxTitleLength}
        ref={editableTitleRef}
      />
    ),
    [title, handleTitleChange, isEditing, setIsEditing, canUpdate]
  );

  const menuElement = React.useMemo(
    () =>
      document && !isMoving && !isEditing && !isDraggingAnyDocument ? (
        <Fade>
          {can.createChildDocument && (
            <Tooltip content={t("New doc")}>
              <NudeButton
                aria-label={t("New nested document")}
                onClick={(ev) => {
                  ev.preventDefault();
                  setIsAddingNewChild();
                  setExpanded();
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
      ) : undefined,
    [
      document,
      isMoving,
      isEditing,
      isDraggingAnyDocument,
      can.createChildDocument,
      t,
      setIsAddingNewChild,
      setExpanded,
      handleRename,
      handleMenuOpen,
      handleMenuClose,
    ]
  );

  return (
    <ActionContextProvider
      value={{
        activeDocumentId: node.id,
      }}
    >
      <Relative ref={parentRef}>
        {isDraggingAnyDocument && collection?.isManualSort && index === 0 && (
          <DropCursor
            isActiveDrop={isOverReorderAbove}
            innerRef={dropToReorderAbove}
            position="top"
          />
        )}
        <Draggable
          key={node.id}
          ref={drag}
          $isDragging={isDragging}
          $isMoving={isMoving}
          onKeyDown={handleKeyDown}
        >
          <div ref={dropToReparent}>
            <DropToImport documentId={node.id}>
              <SidebarLink
                // @ts-expect-error react-router type is wrong, string component is fine.
                component={isEditing ? "div" : undefined}
                expanded={hasChildren ? isExpanded : undefined}
                onDisclosureClick={handleDisclosureClick}
                onClickIntent={handlePrefetch}
                contextAction={contextMenuAction}
                to={toPath}
                icon={iconElement}
                label={labelElement}
                ellipsis={!isEditing}
                isActive={isActiveCheck}
                isActiveDrop={isOverReparent && canDropToReparent}
                depth={depth}
                exact={false}
                showActions={menuOpen}
                scrollIntoViewIfNeeded={sidebarContext === "collections"}
                isDraft={isDraft}
                ref={ref}
                menu={menuElement}
              />
            </DropToImport>
          </div>
        </Draggable>
        {isDraggingAnyDocument && collection?.isManualSort && (
          <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
        )}
      </Relative>
      {isAddingNewChild && (
        <SidebarLink
          isActive={() => true}
          depth={depth + 1}
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
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
        <Folder expanded={expanded && !isDragging}>
          {nodeChildren.map((childNode, childIndex) => (
            <DocumentLink
              key={childNode.id}
              collection={collection}
              membership={membership}
              node={childNode}
              activeDocument={activeDocument}
              prefetchDocument={prefetchDocument}
              isDraft={childNode.isDraft}
              depth={depth + 1}
              index={childIndex}
              parentId={node.id}
            />
          ))}
        </Folder>
      </SidebarDisclosureContext.Provider>
    </ActionContextProvider>
  );
}

const Draggable = styled.div<{ $isDragging?: boolean; $isMoving?: boolean }>`
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging || props.$isMoving ? 0.1 : 1)};
  pointer-events: ${(props) => (props.$isMoving ? "none" : "inherit")};
`;

const DocumentLink = observer(React.forwardRef(InnerDocumentLink));

export default DocumentLink;
