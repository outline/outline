import fractionalIndex from "fractional-index";
import { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { IconType, NotificationEventType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import GroupMembership from "~/models/GroupMembership";
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

  const [expanded, setExpanded, setCollapsed] = useBoolean(
    membership.documentId === ui.activeDocumentId &&
      locationSidebarContext === sidebarContext
  );

  React.useEffect(() => {
    if (
      membership.documentId === ui.activeDocumentId &&
      locationSidebarContext === sidebarContext
    ) {
      setExpanded();
    }
  }, [
    membership.documentId,
    ui.activeDocumentId,
    sidebarContext,
    locationSidebarContext,
    setExpanded,
  ]);

  React.useEffect(() => {
    if (documentId) {
      void documents.fetch(documentId);
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
      if (expanded) {
        setCollapsed();
      } else {
        setExpanded();
      }
    },
    [expanded, setExpanded, setCollapsed]
  );

  const parentRef = React.useRef<HTMLDivElement>(null);
  const node = React.useMemo(() => document?.asNavigationNode, [document]);
  const [{ isOverReparent, canDropToReparent }, dropToReparent] =
    useDropToReparentDocument(node, setExpanded, parentRef);

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

    const node = document.asNavigationNode;
    const childDocuments = node.children;
    const hasChildDocuments = childDocuments.length > 0;

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
                  hasChildDocuments && !isDragging ? expanded : undefined
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
        <Folder expanded={displayChildDocuments}>
          {childDocuments.map((node, index) => (
            <DocumentLink
              key={node.id}
              node={node}
              collection={collection}
              activeDocument={documents.active}
              isDraft={node.isDraft}
              depth={2}
              index={index}
            />
          ))}
        </Folder>
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
