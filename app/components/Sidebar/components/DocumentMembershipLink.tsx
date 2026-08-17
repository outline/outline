import fractionalIndex from "fractional-index";
import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router-dom";
import { NotificationEventType, UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import type GroupMembership from "~/models/GroupMembership";
import UserMembership from "~/models/UserMembership";
import type { RefHandle } from "~/components/EditableTitle";
import { useActiveSidebarContext } from "~/hooks/useActiveSidebarContext";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import * as Scenes from "~/routes/scenes";
import {
  useDragMembership,
  useDropToReorderUserMembership,
  useDropToReparentDocument,
} from "../hooks/useDragAndDrop";
import SidebarExpansionContext, {
  useSidebarExpansionState,
} from "./SidebarExpansionContext";
import { useSidebarLabelAndIcon } from "../hooks/useSidebarLabelAndIcon";
import DocumentLink from "./DocumentLink";
import DocumentRow from "./DocumentRow";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import SidebarDisclosureContext, {
  useSidebarDisclosure,
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";
import { useSidebarContext, type SidebarContextType } from "./SidebarContext";
import { documentEditPath } from "~/utils/routeHelpers";

type Props = {
  membership: UserMembership | GroupMembership;
  depth?: number;
};

/**
 * A sidebar row for a document reached through a membership, together with the
 * tree of documents nested below it. Used by every section that lists
 * documents outside a collection – shared with me, groups, and personal.
 */
function DocumentMembershipLink({ membership, depth = 0 }: Props) {
  const { ui, collections, documents } = useStores();
  const { fetchChildDocuments } = documents;
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { documentId } = membership;
  const isActiveDocument = documentId === ui.activeDocumentId;
  const activeSidebarContext = useActiveSidebarContext();
  const sidebarContext = useSidebarContext();
  const user = useCurrentUser();
  const history = useHistory();
  const document = documentId ? documents.get(documentId) : undefined;
  const can = usePolicy(documentId ?? "");
  const [isEditing, setIsEditing] = React.useState(false);
  const editableTitleRef = React.useRef<RefHandle>(null);

  const handleTitleChange = React.useCallback(
    async (value: string) => {
      if (!documentId) {
        return;
      }
      await documents.update({
        id: documentId,
        title: value,
      });
    },
    [documents, documentId]
  );

  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);

  const contextMenuAction = useDocumentMenuAction({
    documentId: documentId ?? "",
    onRename: handleRename,
  });

  const handleNewDoc = React.useCallback(
    async (input: string) => {
      if (!documentId) {
        return;
      }
      const newDocument = await documents.create(
        {
          parentDocumentId: documentId,
          fullWidth:
            document?.fullWidth ??
            user.getPreference(UserPreference.FullWidthDocuments),
          title: input,
          data: ProsemirrorDataHelper.getEmpty(),
        },
        { publish: true }
      );
      membership.addDocument(newDocument, documentId);
      history.push({
        pathname: documentEditPath(newDocument),
        state: { sidebarContext },
      });
    },
    [documents, documentId, document, membership, sidebarContext, user, history]
  );

  const membershipDocuments = membership.documents;
  const expansion = useSidebarExpansionState(
    membershipDocuments,
    ui.activeDocumentId
  );
  const isActiveDocumentInPath = ui.activeDocumentId
    ? membership.pathToDocument(ui.activeDocumentId).length > 0
    : false;

  const [expanded, setExpanded, setCollapsed] = useBoolean(
    isActiveDocumentInPath && activeSidebarContext === sidebarContext
  );

  const { event: disclosureEvent, onDisclosureClick } =
    useSidebarDisclosureState();

  useSidebarDisclosure(setExpanded, setCollapsed);

  React.useEffect(() => {
    if (isActiveDocumentInPath && activeSidebarContext === sidebarContext) {
      setExpanded();
    }
  }, [
    isActiveDocumentInPath,
    sidebarContext,
    activeSidebarContext,
    setExpanded,
  ]);

  React.useEffect(() => {
    if (documentId) {
      void documents.fetch(documentId);
      void membership.fetchDocuments();
    }
  }, [documentId, documents, membership]);

  React.useEffect(() => {
    if (isActiveDocument && membership.documentId) {
      void fetchChildDocuments(membership.documentId);
    }
  }, [fetchChildDocuments, isActiveDocument, membership.documentId]);

  const handleDisclosureClick = React.useCallback(
    (ev?: React.MouseEvent<HTMLElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      const willExpand = !expanded;
      if (willExpand) {
        setExpanded();
        if (ev?.altKey && membershipDocuments) {
          expansion.expandAll(membershipDocuments);
        }
      } else {
        setCollapsed();
        if (ev?.altKey) {
          expansion.collapseAll();
        }
      }
      onDisclosureClick(willExpand, !!ev?.altKey);
    },
    [
      expanded,
      setExpanded,
      setCollapsed,
      onDisclosureClick,
      expansion,
      membershipDocuments,
    ]
  );

  const parentRef = React.useRef<HTMLDivElement>(null);
  const reparentableNode = React.useMemo(
    () => document?.asNavigationNode,
    [document]
  );
  const [{ isOverReparent }, dropToReparent] = useDropToReparentDocument(
    reparentableNode,
    setExpanded,
    parentRef
  );

  const { icon } = useSidebarLabelAndIcon(membership);
  const [{ isDragging }, draggableRef] = useDragMembership(membership);

  const getIndex = () => {
    if (membership instanceof UserMembership) {
      const next = membership?.next();
      return fractionalIndex(membership?.index || null, next?.index || null);
    }
    return "";
  };
  const [reorderProps, dropToReorderRef] =
    useDropToReorderUserMembership(getIndex);

  const isActive = React.useCallback(
    (match, location: Location<{ sidebarContext?: SidebarContextType }>) =>
      !!match && location.state?.sidebarContext === sidebarContext,
    [sidebarContext]
  );

  const displayChildDocuments = expanded && !isDragging;

  if (!document) {
    return null;
  }

  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;

  const childDocuments = membershipDocuments ?? [];
  const hasChildren = childDocuments.length > 0;
  const childDepth = Math.max(depth + 1, 2);

  const unreadBadge =
    document.unreadNotifications.filter(
      (notification) =>
        notification.event === NotificationEventType.AddUserToDocument
    ).length > 0;

  const menu = !isDragging ? (
    <DocumentMenu
      document={document}
      onRename={handleRename}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  ) : undefined;

  return (
    <DocumentRow
      documentId={documentId ?? ""}
      document={document}
      to={{ pathname: document.path, state: { sidebarContext } }}
      onClickIntent={Scenes.Document.preload}
      depth={depth}
      icon={icon}
      canEdit={can.update}
      labelText={document.titleWithDefault}
      onTitleChange={handleTitleChange}
      editableTitleRef={editableTitleRef}
      onEditingChange={setIsEditing}
      unreadBadge={unreadBadge}
      expanded={expanded && !isDragging}
      hasChildren={hasChildren}
      onDisclosureClick={handleDisclosureClick}
      onExpand={setExpanded}
      onCollapse={setCollapsed}
      dragRef={isEditing ? undefined : draggableRef}
      isDragging={isDragging}
      parentRef={parentRef}
      dropToReparentRef={dropToReparent}
      isActiveDropTarget={isOverReparent}
      menu={menu}
      menuOpen={menuOpen}
      canCreateChild={can.createChildDocument}
      onCreateChild={handleNewDoc}
      newChildDepth={childDepth}
      contextAction={contextMenuAction}
      isActiveOverride={isActive}
    >
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
        <SidebarExpansionContext.Provider value={expansion}>
          <Folder expanded={displayChildDocuments}>
            {childDocuments.map((childNode, index) => (
              <DocumentLink
                key={childNode.id}
                node={childNode}
                collection={collection}
                membership={membership}
                activeDocument={documents.active}
                isDraft={childNode.isDraft}
                depth={childDepth}
                index={index}
                parentId={document.id}
              />
            ))}
          </Folder>
        </SidebarExpansionContext.Provider>
      </SidebarDisclosureContext.Provider>
      {reorderProps.isDragging && (
        <DropCursor
          isActiveDrop={reorderProps.isOverCursor}
          innerRef={dropToReorderRef}
        />
      )}
    </DocumentRow>
  );
}

export default observer(DocumentMembershipLink);
