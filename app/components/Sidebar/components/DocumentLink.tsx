import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type { match } from "react-router";
import { useHistory } from "react-router-dom";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import { DocumentPermission, UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import type { FlattenedTreeNode } from "@shared/utils/tree";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type GroupMembership from "~/models/GroupMembership";
import type UserMembership from "~/models/UserMembership";
import type { RefHandle } from "~/components/EditableTitle";
import useBoolean from "~/hooks/useBoolean";
import { useComputed } from "~/hooks/useComputed";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import { preloadEditor } from "~/routes/scenes";
import { documentEditPath } from "~/utils/routeHelpers";
import {
  useDragDocument,
  useDropToReorderDocument,
  useDropToReparentDocument,
} from "../hooks/useDragAndDrop";
import { useSidebarExpansion } from "./SidebarExpansionContext";
import DocumentRow from "./DocumentRow";
import DropCursor from "./DropCursor";
import { indentForDepth } from "./SidebarLink";
import type { SidebarContextType } from "./SidebarContext";
import { useSidebarContext } from "./SidebarContext";

type Props = {
  node: NavigationNode;
  collection?: Collection;
  membership?: UserMembership | GroupMembership;
  prefetchDocument?: (documentId: string) => Promise<Document | void>;
  isDraft?: boolean;
  depth: number;
  index: number;
  parentId?: string;
  hasChildren: boolean;
  /**
   * Ancestors whose subtree ends with this node, nearest first. A drop at the
   * end of an expanded subtree can land beside one of them instead of inside.
   */
  trailingAncestors: FlattenedTreeNode[];
};

/** A position in the document tree that a dragged document can be dropped at. */
type DropTarget = {
  parentDocumentId: string | undefined;
  index: number;
  depth: number;
};

const DocumentLink = observer(function DocumentLink({
  node,
  collection,
  membership,
  prefetchDocument,
  isDraft,
  depth,
  index,
  parentId,
  hasChildren,
  trailingAncestors,
}: Props) {
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
    preloadEditor();
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
      match: match | null,
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
  // Computed so that a change to movingDocumentId only re-renders the rows
  // whose boolean actually flips, not every observer of the store field.
  const isMoving = useComputed(
    () => documents.movingDocumentId === node.id,
    [documents, node.id]
  );
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
  const [{ isOverReparent }, dropToReparent] = useDropToReparentDocument(
    node,
    handleExpand,
    parentRef
  );

  // Fall back so document-only access (e.g. "Manage" on a parent) can reorder.
  const moveCollectionId = collection?.id ?? document?.collectionId;

  const targetAbove = React.useMemo<DropTarget>(
    () => ({ parentDocumentId: parentId, index, depth }),
    [parentId, index, depth]
  );

  // Below an expanded node the only position is its first child. Otherwise the
  // position after the node comes first, then any ancestor positions that end
  // here, so the pointer's horizontal position picks the depth. The node being
  // dragged skips the position after itself, which would be a no-op.
  const targetsBelow = React.useMemo<DropTarget[]>(() => {
    if (expanded && hasChildren) {
      return [{ parentDocumentId: node.id, index: 0, depth: depth + 1 }];
    }
    const afterSelf = isDragging
      ? []
      : [{ parentDocumentId: parentId, index: index + 1, depth }];
    const afterAncestors = trailingAncestors.map((ancestor) => ({
      parentDocumentId: ancestor.parentId,
      index: ancestor.index + 1,
      depth: ancestor.depth,
    }));
    return [...afterSelf, ...afterAncestors];
  }, [
    expanded,
    hasChildren,
    isDragging,
    node.id,
    parentId,
    index,
    depth,
    trailingAncestors,
  ]);

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

  const menu = document ? (
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

  // Cursors stay mounted between drags so that drag start/end doesn't change
  // the tree for every row.
  const cursorBefore =
    canReorderHere && index === 0 ? (
      <ReorderDropCursor
        node={node}
        collection={collection}
        collectionId={moveCollectionId}
        target={targetAbove}
        position="top"
      />
    ) : undefined;

  // Later cursors render on top, so each outer level's narrower hit area wins
  // when the pointer is left of the previous level's indent.
  const cursorAfter = canReorderHere
    ? targetsBelow.map((target, level) => (
        <ReorderDropCursor
          key={level}
          node={node}
          collection={collection}
          collectionId={moveCollectionId}
          target={target}
          hitWidth={
            level > 0
              ? indentForDepth(targetsBelow[level - 1].depth)
              : undefined
          }
        />
      ))
    : undefined;

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
      isActiveDropTarget={isOverReparent}
      cursorBefore={cursorBefore}
      cursorAfter={cursorAfter}
      menu={menu}
      menuOpen={menuOpen}
      canCreateChild={can.createChildDocument}
      onCreateChild={handleNewDoc}
      contextAction={contextMenuAction}
      isActiveOverride={isActiveCheck}
      onClickIntent={handlePrefetch}
    />
  );
});

type ReorderDropCursorProps = {
  node: NavigationNode;
  collection?: Collection;
  collectionId?: string | null;
  target: DropTarget;
  position?: "top";
  hitWidth?: number;
};

const ReorderDropCursor = observer(function ReorderDropCursor({
  node,
  collection,
  collectionId,
  target,
  position,
  hitWidth,
}: ReorderDropCursorProps) {
  const [{ isOverReorder }, dropToReorder] = useDropToReorderDocument(
    node,
    collection,
    (item) => {
      if (!collectionId) {
        return;
      }
      return {
        documentId: item.id,
        collectionId,
        parentDocumentId: target.parentDocumentId,
        index: target.index,
      };
    }
  );

  return (
    <DropCursor
      isActiveDrop={isOverReorder}
      innerRef={dropToReorder}
      position={position}
      indent={indentForDepth(target.depth)}
      hitWidth={hitWidth}
    />
  );
});

export default DocumentLink;
