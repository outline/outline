import fractionalIndex from "fractional-index";
import type { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { IconType, NotificationEventType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type GroupMembership from "~/models/GroupMembership";
import UserMembership from "~/models/UserMembership";
import Fade from "~/components/Fade";
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
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import Relative from "./Relative";
import SidebarDisclosureContext, {
  useSidebarDisclosure,
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";
import { useSidebarContext, type SidebarContextType } from "./SidebarContext";
import SidebarLink from "./SidebarLink";

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

  // Subscribe to recursive expand/collapse events from an ancestor (e.g. GroupLink)
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
  }, [documentId, documents]);

  React.useEffect(() => {
    if (isActiveDocument && membership.documentId) {
      void fetchChildDocuments(membership.documentId);
    }
  }, [fetchChildDocuments, isActiveDocument, membership.documentId]);

  const handleDisclosureClick = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      const willExpand = !expanded;
      if (willExpand) {
        setExpanded();
      } else {
        setCollapsed();
      }
      onDisclosureClick(willExpand, ev.altKey);
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

  const displayChildDocuments = expanded && !isDragging;

  if (document) {
    const { icon: docIcon } = document;
    const label =
      determineIconType(docIcon) === IconType.Emoji
        ? document.title.replace(docIcon!, "")
        : document.titleWithDefault;
    const collection = document.collectionId
      ? collections.get(document.collectionId)
      : undefined;

    const childDocuments = membership.documents ?? [];

    return (
      <>
        <Relative ref={parentRef}>
          <Draggable
            key={membership.id}
            ref={draggableRef}
            $isDragging={isDragging}
          >
            <div ref={dropToReparent}>
              <SidebarLink
                isActiveDrop={isOverReparent && canDropToReparent}
                depth={depth}
                to={{
                  pathname: document.path,
                  state: { sidebarContext },
                }}
                expanded={
                  childDocuments.length > 0 && !isDragging
                    ? expanded
                    : undefined
                }
                onDisclosureClick={handleDisclosureClick}
                icon={icon}
                isActive={(
                  match,
                  location: Location<{ sidebarContext?: SidebarContextType }>
                ) =>
                  !!match && location.state?.sidebarContext === sidebarContext
                }
                label={label}
                exact={false}
                unreadBadge={
                  document.unreadNotifications.filter(
                    (notification) =>
                      notification.event ===
                      NotificationEventType.AddUserToDocument
                  ).length > 0
                }
                showActions={menuOpen}
                menu={
                  document && !isDragging ? (
                    <Fade>
                      <DocumentMenu
                        document={document}
                        onOpen={handleMenuOpen}
                        onClose={handleMenuClose}
                      />
                    </Fade>
                  ) : undefined
                }
              />
            </div>
          </Draggable>
        </Relative>
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
      </>
    );
  }

  return null;
}

const Draggable = styled.div<{ $isDragging?: boolean }>`
  position: relative;
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};
`;

export default observer(SharedWithMeLink);
