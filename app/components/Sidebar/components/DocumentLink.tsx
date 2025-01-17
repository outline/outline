import { Location } from "history";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { NavigationNode } from "@shared/types";
import { sortNavigationNodes } from "@shared/utils/collections";
import { DocumentValidation } from "@shared/validations";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import { newNestedDocumentPath } from "~/utils/routeHelpers";
import {
  useDragDocument,
  useDropToReorderDocument,
  useDropToReparentDocument,
} from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import DropToImport from "./DropToImport";
import EditableTitle, { RefHandle } from "./EditableTitle";
import Folder from "./Folder";
import Relative from "./Relative";
import { SidebarContextType, useSidebarContext } from "./SidebarContext";
import SidebarLink from "./SidebarLink";

type Props = {
  node: NavigationNode;
  collection?: Collection;
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
  const canUpdate = usePolicy(node.id).update;
  const isActiveDocument = activeDocument && activeDocument.id === node.id;
  const hasChildDocuments =
    !!node.children.length || activeDocument?.parentDocumentId === node.id;
  const document = documents.get(node.id);
  const { fetchChildDocuments } = documents;
  const [isEditing, setIsEditing] = React.useState(false);
  const editableTitleRef = React.useRef<RefHandle>(null);
  const sidebarContext = useSidebarContext();

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

  const showChildren = React.useMemo(
    () =>
      !!(
        hasChildDocuments &&
        activeDocument &&
        collection &&
        (collection
          .pathToDocument(activeDocument.id)
          .map((entry) => entry.id)
          .includes(node.id) ||
          isActiveDocument)
      ),
    [hasChildDocuments, activeDocument, isActiveDocument, node, collection]
  );

  const [expanded, setExpanded, setCollapsed] = useBoolean(showChildren);

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
    (ev) => {
      ev?.preventDefault();
      expanded ? setCollapsed() : setExpanded();
    },
    [setCollapsed, setExpanded, expanded]
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
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const isMoving = documents.movingDocumentId === node.id;
  const can = policies.abilities(node.id);
  const icon = document?.icon || node.icon || node.emoji;
  const color = document?.color || node.color;

  // Draggable
  const [{ isDragging }, drag] = useDragDocument(node, depth, document);

  // Drop to re-parent
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [{ isOverReparent, canDropToReparent }, dropToReparent] =
    useDropToReparentDocument(node, setExpanded, parentRef);

  // Drop to reorder
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

  return (
    <>
      <Relative ref={parentRef}>
        <Draggable
          key={node.id}
          ref={drag}
          $isDragging={isDragging}
          $isMoving={isMoving}
          onKeyDown={handleKeyDown}
        >
          <div ref={dropToReparent}>
            <DropToImport documentId={node.id} activeClassName="activeDropZone">
              <SidebarLink
                expanded={hasChildren ? isExpanded : undefined}
                onDisclosureClick={handleDisclosureClick}
                onClickIntent={handlePrefetch}
                to={{
                  pathname: node.url,
                  state: {
                    title: node.title,
                    sidebarContext,
                  },
                }}
                icon={icon && <Icon value={icon} color={color} />}
                label={
                  <EditableTitle
                    title={title}
                    onSubmit={handleTitleChange}
                    onEditing={setIsEditing}
                    canUpdate={canUpdate}
                    maxLength={DocumentValidation.maxTitleLength}
                    ref={editableTitleRef}
                  />
                }
                isActive={(
                  match,
                  location: Location<{
                    sidebarContext?: SidebarContextType;
                  }>
                ) => {
                  if (sidebarContext !== location.state?.sidebarContext) {
                    return false;
                  }
                  return (
                    (document && location.pathname.endsWith(document.urlId)) ||
                    !!match
                  );
                }}
                isActiveDrop={isOverReparent && canDropToReparent}
                depth={depth}
                exact={false}
                showActions={menuOpen}
                scrollIntoViewIfNeeded={sidebarContext === "collections"}
                isDraft={isDraft}
                ref={ref}
                menu={
                  document &&
                  !isMoving &&
                  !isEditing &&
                  !isDraggingAnyDocument ? (
                    <Fade>
                      {can.createChildDocument && (
                        <Tooltip content={t("New doc")}>
                          <NudeButton
                            type={undefined}
                            aria-label={t("New nested document")}
                            as={Link}
                            to={newNestedDocumentPath(document.id)}
                          >
                            <PlusIcon />
                          </NudeButton>
                        </Tooltip>
                      )}
                      <DocumentMenu
                        document={document}
                        onRename={() =>
                          editableTitleRef.current?.setIsEditing(true)
                        }
                        onOpen={handleMenuOpen}
                        onClose={handleMenuClose}
                      />
                    </Fade>
                  ) : undefined
                }
              />
            </DropToImport>
          </div>
        </Draggable>
        {isDraggingAnyDocument && collection?.isManualSort && (
          <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
        )}
      </Relative>
      <Folder expanded={expanded && !isDragging}>
        {nodeChildren.map((childNode, index) => (
          <DocumentLink
            key={childNode.id}
            collection={collection}
            node={childNode}
            activeDocument={activeDocument}
            prefetchDocument={prefetchDocument}
            isDraft={childNode.isDraft}
            depth={depth + 1}
            index={index}
            parentId={node.id}
          />
        ))}
      </Folder>
    </>
  );
}

const Draggable = styled.div<{ $isDragging?: boolean; $isMoving?: boolean }>`
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging || props.$isMoving ? 0.1 : 1)};
  pointer-events: ${(props) => (props.$isMoving ? "none" : "all")};
`;

const DocumentLink = observer(React.forwardRef(InnerDocumentLink));

export default DocumentLink;
