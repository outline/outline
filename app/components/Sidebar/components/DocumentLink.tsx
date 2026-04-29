import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import { UserPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { sortNavigationNodes } from "@shared/utils/collections";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type GroupMembership from "~/models/GroupMembership";
import type UserMembership from "~/models/UserMembership";
import type { RefHandle } from "~/components/EditableTitle";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import { documentEditPath } from "~/utils/routeHelpers";
import {
  useDragDocument,
  useDropToReorderDocument,
  useDropToReparentDocument,
} from "../hooks/useDragAndDrop";
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

const DocumentLink = observer(function DocumentLinkInner({
  node,
  collection,
  membership,
  activeDocument,
  prefetchDocument,
  isDraft,
  depth,
  index,
  parentId,
}: Props) {
  const { documents } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const can = usePolicy(node.id);
  const canUpdate = can.update;
  const isActiveDocument = activeDocument && activeDocument.id === node.id;
  const hasChildDocuments =
    !!node.children.length || activeDocument?.parentDocumentId === node.id;
  const document = documents.get(node.id);
  const { fetchChildDocuments } = documents;
  const [isEditing, setIsEditing] = React.useState(false);
  const editableTitleRef = React.useRef<RefHandle>(null);
  const sidebarContext = useSidebarContext();
  const user = useCurrentUser();
  const expansion = useSidebarExpansion();
  const expanded = expansion.isExpanded(node.id);

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
      if (expansion.isExpanded(node.id)) {
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

  const title = document?.title || node.title || t("Untitled");
  const hasChildren = nodeChildren.length > 0;

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
          data: ProsemirrorHelper.getEmptyDocument(),
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

  const cursorBefore =
    isDraggingAnyDocument && collection?.isManualSort && index === 0 ? (
      <DropCursor
        isActiveDrop={isOverReorderAbove}
        innerRef={dropToReorderAbove}
        position="top"
      />
    ) : undefined;

  const cursorAfter =
    isDraggingAnyDocument && collection?.isManualSort ? (
      <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
    ) : undefined;

  return (
    <DocumentRow
      documentId={node.id}
      document={document}
      to={toPath}
      depth={depth}
      isDraft={isDraft}
      scrollIntoViewIfNeeded={sidebarContext === "collections"}
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
    >
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
    </DocumentRow>
  );
});

export default DocumentLink;
