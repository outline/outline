import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type { match } from "react-router";
import { useHistory } from "react-router-dom";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import { UserPreference } from "@shared/types";
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
import { DocumentIcon } from "~/components/Icons/DocumentIcon";
import {
  useDragDocument,
  useDropToReparentDocument,
} from "../hooks/useDragAndDrop";
import { useSidebarExpansion } from "./SidebarExpansionContext";
import DocumentRow from "./DocumentRow";
import { addLinkFromUrl } from "./LinkDialog";
import { useReorderDropCursors } from "./ReorderDropCursors";
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
  const stores = useStores();
  const { documents } = stores;
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
  const isEmpty = document?.isEmpty;

  // Rows at the top level of a section show the default icon, so that they
  // align with the other rows in the sidebar.
  const iconElement = React.useMemo(
    () =>
      icon ? (
        <Icon value={icon} color={color} initial={initial} />
      ) : depth === 0 ? (
        <DocumentIcon empty={isEmpty} />
      ) : undefined,
    [icon, color, initial, depth, isEmpty]
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
    collection,
    handleExpand
  );

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

  const handleNewLink = React.useCallback(
    async (url: string) => {
      if (collection) {
        await addLinkFromUrl({
          stores,
          collection,
          parentDocumentId: node.id,
          url,
          index: 0,
        });
      }
    },
    [stores, collection, node.id]
  );

  const contextMenuAction = useDocumentMenuAction({
    documentId: node.id,
    onRename: handleRename,
    showLinkActions: true,
  });

  const menu = document ? (
    <DocumentMenu
      document={document}
      showLinkActions
      onRename={handleRename}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  ) : undefined;

  // Fall back so document-only access (e.g. "Manage" on a parent) can reorder.
  const { cursorBefore, cursorAfter } = useReorderDropCursors({
    node,
    collection,
    collectionId: document?.collectionId,
    membership,
    depth,
    index,
    parentId,
    expanded,
    hasChildren,
    isDragging,
    trailingAncestors,
  });

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
      onCreateChildLink={collection && !isDraft ? handleNewLink : undefined}
      contextAction={contextMenuAction}
      isActiveOverride={isActiveCheck}
      onClickIntent={handlePrefetch}
    />
  );
});

export default DocumentLink;
