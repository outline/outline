import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import scrollIntoView from "scroll-into-view-if-needed";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import { DocumentPermission, UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { sortNavigationNodes } from "@shared/utils/collections";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type GroupMembership from "~/models/GroupMembership";
import type UserMembership from "~/models/UserMembership";
import type { RefHandle } from "~/components/EditableTitle";
import { useActiveSidebarContext } from "~/hooks/useActiveSidebarContext";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import useOnScreen from "~/hooks/useOnScreen";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import { documentEditPath } from "~/utils/routeHelpers";
import {
  useDragDocument,
  useDropToReorderDocument,
  useDropToReparentDocument,
} from "../hooks/useDragAndDrop";
import { useIsDragActive, useSidebarScrollElement } from "./DragActiveContext";
import { useSidebarExpansion } from "./SidebarExpansionContext";
import DocumentRow from "./DocumentRow";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import type { SidebarContextType } from "./SidebarContext";
import { useSidebarContext } from "./SidebarContext";

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

// Approximate rendered row height; used to reserve space for unmounted rows so
// the scroll container stays the right height and IntersectionObserver triggers
// correctly as the user scrolls.
const ROW_HEIGHT = 30;

// Pre-mount rows just outside the viewport so scrolling stays smooth and drop
// targets exist a screen ahead when a drag starts.
const ROOT_MARGIN = "300px 0px";

const DocumentLink = observer(function DocumentLink(props: Props) {
  const { node, collection, activeDocument } = props;
  const { documents } = useStores();
  const expansion = useSidebarExpansion();
  const expanded = expansion.isExpanded(node.id);
  const isActiveDocument = activeDocument && activeDocument.id === node.id;
  const hasChildDocuments =
    !!node.children.length || activeDocument?.parentDocumentId === node.id;
  const sidebarContext = useSidebarContext();
  const activeSidebarContext = useActiveSidebarContext();
  const { fetchChildDocuments } = documents;

  // Keep expansion/data effects on the outer so they run regardless of whether
  // the heavy row content is currently mounted.
  React.useEffect(() => {
    if (expanded && !hasChildDocuments) {
      expansion.collapse(node.id);
    }
  }, [expansion, expanded, hasChildDocuments, node.id]);

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

  const insertDraftChild = !!(
    activeDocument?.isDraft &&
    activeDocument?.isActive &&
    activeDocument?.parentDocumentId === node.id
  );

  const draftNavNode = insertDraftChild
    ? activeDocument?.asNavigationNode
    : undefined;

  const nodeChildren = React.useMemo(
    () =>
      collection && draftNavNode
        ? sortNavigationNodes(
            [draftNavNode, ...node.children],
            collection.sort,
            false
          )
        : node.children,
    [draftNavNode, collection, node.children]
  );

  // Visibility gate: only mount the heavy inner content when scrolled near the
  // viewport, but keep it mounted while a drag is in progress so the dragged
  // source (or a drop target the user is heading toward) isn't yanked.
  const scrollRoot = useSidebarScrollElement();
  const placeholderRef = React.useRef<HTMLDivElement>(null);
  const observerOptions = React.useMemo(
    () => ({ root: scrollRoot, rootMargin: ROOT_MARGIN }),
    [scrollRoot]
  );
  const isOnScreen = useOnScreen(placeholderRef, observerOptions);
  const isDragActive = useIsDragActive();
  const [mounted, setMounted] = React.useState(false);

  // Flip mount state during render (not in an effect) so the first paint
  // already contains the row content when the placeholder is on screen,
  // avoiding a blank frame.
  if (isOnScreen && !mounted) {
    setMounted(true);
  } else if (!isOnScreen && !isDragActive && mounted) {
    setMounted(false);
  }

  // The inner row's own scrollIntoView only fires while it is mounted, which
  // skips active documents that are virtualized off-screen. Only scroll the tree
  // that matches the navigation context so a document rendered in multiple
  // contexts (collections/starred/shared) doesn't jump to an unexpected section;
  // when no context is set, fall back to the collections tree alone.
  React.useLayoutEffect(() => {
    if (
      isActiveDocument &&
      (activeSidebarContext === sidebarContext ||
        (!activeSidebarContext && sidebarContext === "collections")) &&
      placeholderRef.current
    ) {
      scrollIntoView(placeholderRef.current, {
        scrollMode: "if-needed",
        behavior: "auto",
        boundary: (parent) => parent.id !== "sidebar",
      });
    }
  }, [isActiveDocument, sidebarContext, activeSidebarContext]);

  return (
    <>
      <div ref={placeholderRef} style={{ minHeight: ROW_HEIGHT }}>
        {mounted ? (
          <DocumentLinkInner {...props} hasChildren={nodeChildren.length > 0} />
        ) : null}
      </div>
      <Folder expanded={expanded}>
        {nodeChildren.map((childNode, childIndex) => (
          <DocumentLink
            key={childNode.id}
            collection={collection}
            membership={props.membership}
            node={childNode}
            activeDocument={activeDocument}
            prefetchDocument={props.prefetchDocument}
            isDraft={childNode.isDraft}
            depth={props.depth + 1}
            index={childIndex}
            parentId={node.id}
          />
        ))}
      </Folder>
    </>
  );
});

type InnerProps = Props & {
  hasChildren: boolean;
};

const DocumentLinkInner = observer(function DocumentLinkInner({
  node,
  collection,
  membership,
  prefetchDocument,
  isDraft,
  depth,
  index,
  parentId,
  hasChildren,
}: InnerProps) {
  const { documents } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const can = usePolicy(node.id);
  const canUpdate = can.update;
  const document = documents.get(node.id);
  const [isEditing, setIsEditing] = React.useState(false);
  const editableTitleRef = React.useRef<RefHandle>(null);
  const sidebarContext = useSidebarContext();
  const user = useCurrentUser();
  const expansion = useSidebarExpansion();
  const expanded = expansion.isExpanded(node.id);

  const handleDisclosureClick = React.useCallback(
    (ev?: React.MouseEvent<HTMLElement>) => {
      if (expanded) {
        if (ev?.altKey) {
          expansion.collapseDescendants(node);
        } else {
          expansion.collapse(node.id);
        }
      } else {
        if (ev?.altKey) {
          expansion.expandDescendants(node);
        } else {
          expansion.expand(node.id);
        }
      }
    },
    [expansion, expanded, node]
  );

  const handleExpand = React.useCallback(() => {
    expansion.expand(node.id);
  }, [expansion, node.id]);

  const handleCollapse = React.useCallback(() => {
    expansion.collapse(node.id);
  }, [expansion, node.id]);

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
  const icon = document?.icon || node.icon || node.emoji;
  const color = document?.color || node.color;
  const initial = document?.initial || node.title.charAt(0).toUpperCase();

  const iconElement = React.useMemo(
    () =>
      icon ? <Icon value={icon} color={color} initial={initial} /> : undefined,
    [icon, color, initial]
  );

  const [{ isDragging }, drag] = useDragDocument(
    node,
    depth,
    document,
    isEditing
  );

  const parentRef = React.useRef<HTMLDivElement>(null);
  const [{ isOverReparent, canDropToReparent }, dropToReparent] =
    useDropToReparentDocument(node, handleExpand, parentRef);

  // Fall back so document-only access (e.g. "Manage" on a parent) can reorder.
  const moveCollectionId = collection?.id ?? document?.collectionId;

  const [{ isOverReorder: isOverReorderAbove }, dropToReorderAbove] =
    useDropToReorderDocument(node, collection, (item) => {
      if (!moveCollectionId) {
        return;
      }
      return {
        documentId: item.id,
        collectionId: moveCollectionId,
        parentDocumentId: parentId,
        index,
      };
    });

  const [{ isOverReorder, isDraggingAnyDocument }, dropToReorder] =
    useDropToReorderDocument(node, collection, (item) => {
      if (!moveCollectionId) {
        return;
      }
      if (expansion.isExpanded(node.id)) {
        return {
          documentId: item.id,
          collectionId: moveCollectionId,
          parentDocumentId: node.id,
          index: 0,
        };
      }
      return {
        documentId: item.id,
        collectionId: moveCollectionId,
        parentDocumentId: parentId,
        index: index + 1,
      };
    });

  const title = document?.title || node.title || t("Untitled");

  const handleNewDoc = React.useCallback(
    async (input: string) => {
      const newDocument = await documents.create(
        {
          collectionId: collection?.id,
          parentDocumentId: node.id,
          fullWidth:
            document?.fullWidth ??
            user.getPreference(UserPreference.FullWidthDocuments),
          title: input,
          data: ProsemirrorDataHelper.getEmpty(),
        },
        { publish: true }
      );
      collection?.addDocument(newDocument, node.id);
      membership?.addDocument(newDocument, node.id);
      history.push({
        pathname: documentEditPath(newDocument),
        state: { sidebarContext },
      });
    },
    [
      documents,
      collection,
      membership,
      sidebarContext,
      user,
      node.id,
      document,
      history,
    ]
  );

  const contextMenuAction = useDocumentMenuAction({
    documentId: node.id,
    onRename: handleRename,
  });

  const showMenuActions = !isDraggingAnyDocument;
  const menu =
    showMenuActions && document ? (
      <DocumentMenu
        document={document}
        onRename={handleRename}
        onOpen={handleMenuOpen}
        onClose={handleMenuClose}
      />
    ) : undefined;

  // Without a collection we can't read isManualSort; fall back to the shared
  // membership's permission, which is the same for every descendant.
  const canReorderHere = collection
    ? collection.isManualSort
    : membership?.permission === DocumentPermission.Admin ||
      membership?.permission === DocumentPermission.ReadWrite;

  const cursorBefore =
    isDraggingAnyDocument && canReorderHere && index === 0 ? (
      <DropCursor
        isActiveDrop={isOverReorderAbove}
        innerRef={dropToReorderAbove}
        position="top"
      />
    ) : undefined;

  const cursorAfter =
    isDraggingAnyDocument && canReorderHere ? (
      <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
    ) : undefined;

  return (
    <DocumentRow
      documentId={node.id}
      document={document}
      to={toPath}
      depth={depth}
      isDraft={isDraft}
      scrollIntoViewIfNeeded={false}
      icon={iconElement}
      canEdit={canUpdate}
      labelText={title}
      onTitleChange={handleTitleChange}
      editableTitleRef={editableTitleRef}
      onEditingChange={setIsEditing}
      expanded={expanded && !isDragging}
      hasChildren={hasChildren}
      onDisclosureClick={handleDisclosureClick}
      onExpand={handleExpand}
      onCollapse={handleCollapse}
      dragRef={drag}
      isDragging={isDragging}
      isMoving={isMoving}
      parentRef={parentRef}
      dropToReparentRef={dropToReparent}
      isActiveDropTarget={isOverReparent && canDropToReparent}
      cursorBefore={cursorBefore}
      cursorAfter={cursorAfter}
      menu={menu}
      menuOpen={menuOpen}
      canCreateChild={showMenuActions && can.createChildDocument}
      onCreateChild={handleNewDoc}
      contextAction={contextMenuAction}
      isActiveOverride={isActiveCheck}
      onClickIntent={handlePrefetch}
    />
  );
});

export default DocumentLink;
