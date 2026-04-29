import fractionalIndex from "fractional-index";
import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { IconType, NotificationEventType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type GroupMembership from "~/models/GroupMembership";
import UserMembership from "~/models/UserMembership";
import useBoolean from "~/hooks/useBoolean";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import {
  useDragMembership,
  useDropToReorderUserMembership,
  useDropToReparentDocument,
} from "../hooks/useDragAndDrop";
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

type Props = {
  membership: UserMembership | GroupMembership;
  depth?: number;
};

function SharedWithMeLink({ membership, depth = 0 }: Props) {
  const { ui, collections, documents } = useStores();
  const { fetchChildDocuments } = documents;
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { documentId } = membership;
  const isActiveDocument = documentId === ui.activeDocumentId;
  const locationSidebarContext = useLocationSidebarContext();
  const sidebarContext = useSidebarContext();
  const document = documentId ? documents.get(documentId) : undefined;

  const isActiveDocumentInPath = ui.activeDocumentId
    ? membership.pathToDocument(ui.activeDocumentId).length > 0
    : false;

  const [expanded, setExpanded, setCollapsed] = useBoolean(
    isActiveDocumentInPath && locationSidebarContext === sidebarContext
  );

  const { event: disclosureEvent, onDisclosureClick } =
    useSidebarDisclosureState();

  useSidebarDisclosure(setExpanded, setCollapsed);

  React.useEffect(() => {
    if (isActiveDocumentInPath && locationSidebarContext === sidebarContext) {
      setExpanded();
    }
  }, [
    isActiveDocumentInPath,
    sidebarContext,
    locationSidebarContext,
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
      } else {
        setCollapsed();
      }
      onDisclosureClick(willExpand, !!ev?.altKey);
    },
    [expanded, setExpanded, setCollapsed, onDisclosureClick]
  );

  const parentRef = React.useRef<HTMLDivElement>(null);
  const reparentableNode = React.useMemo(
    () => document?.asNavigationNode,
    [document]
  );
  const [{ isOverReparent, canDropToReparent }, dropToReparent] =
    useDropToReparentDocument(reparentableNode, setExpanded, parentRef);

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

  const { icon: docIcon } = document;
  const label =
    determineIconType(docIcon) === IconType.Emoji
      ? document.title.replace(docIcon!, "")
      : document.titleWithDefault;
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;

  const childDocuments = membership.documents ?? [];
  const hasChildren = childDocuments.length > 0;

  const unreadBadge =
    document.unreadNotifications.filter(
      (notification) =>
        notification.event === NotificationEventType.AddUserToDocument
    ).length > 0;

  const menu = !isDragging ? (
    <DocumentMenu
      document={document}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  ) : undefined;

  return (
    <DocumentRow
      documentId={documentId ?? ""}
      document={document}
      to={{ pathname: document.path, state: { sidebarContext } }}
      depth={depth}
      icon={icon}
      canEdit={false}
      label={label}
      unreadBadge={unreadBadge}
      expanded={expanded && !isDragging}
      hasChildren={hasChildren}
      onDisclosureClick={handleDisclosureClick}
      onExpand={setExpanded}
      onCollapse={setCollapsed}
      dragRef={draggableRef}
      isDragging={isDragging}
      parentRef={parentRef}
      dropToReparentRef={dropToReparent}
      isActiveDropTarget={isOverReparent && canDropToReparent}
      menu={menu}
      menuOpen={menuOpen}
      isActiveOverride={isActive}
    >
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
        <Folder expanded={displayChildDocuments}>
          {childDocuments.map((childNode, index) => (
            <DocumentLink
              key={childNode.id}
              node={childNode}
              collection={collection}
              membership={membership}
              activeDocument={documents.active}
              isDraft={childNode.isDraft}
              depth={2}
              index={index}
            />
          ))}
        </Folder>
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

export default observer(SharedWithMeLink);
