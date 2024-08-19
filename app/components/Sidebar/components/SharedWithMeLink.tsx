import fractionalIndex from "fractional-index";
import { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { IconType, NotificationEventType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import GroupMembership from "~/models/GroupMembership";
import UserMembership from "~/models/UserMembership";
import Fade from "~/components/Fade";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";
import {
  useDragMembership,
  useDropToReorderUserMembership,
} from "./useDragAndDrop";
import { useSidebarLabelAndIcon } from "./useSidebarLabelAndIcon";

type Props = {
  userMembership: UserMembership | GroupMembership;
};

function useLocationState() {
  const location = useLocation<{
    sharedWithMe?: boolean;
  }>();
  return location.state?.sharedWithMe;
}

function SharedWithMeLink({ userMembership }: Props) {
  const { ui, collections, documents } = useStores();
  const { fetchChildDocuments } = documents;
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { documentId } = userMembership;
  const isActiveDocument = documentId === ui.activeDocumentId;
  const locationStateStarred = useLocationState();

  const [expanded, setExpanded] = React.useState(
    userMembership.documentId === ui.activeDocumentId && !!locationStateStarred
  );

  React.useEffect(() => {
    if (
      userMembership.documentId === ui.activeDocumentId &&
      locationStateStarred
    ) {
      setExpanded(true);
    }
  }, [userMembership.documentId, ui.activeDocumentId, locationStateStarred]);

  React.useEffect(() => {
    if (documentId) {
      void documents.fetch(documentId);
    }
  }, [documentId, documents]);

  React.useEffect(() => {
    if (isActiveDocument && userMembership.documentId) {
      void fetchChildDocuments(userMembership.documentId);
    }
  }, [fetchChildDocuments, isActiveDocument, userMembership.documentId]);

  const handleDisclosureClick = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded((prevExpanded) => !prevExpanded);
    },
    []
  );

  const { icon } = useSidebarLabelAndIcon(userMembership);
  const [{ isDragging }, draggableRef] = useDragMembership(userMembership);

  const getIndex = () => {
    if (userMembership instanceof UserMembership) {
      const next = userMembership?.next();
      return fractionalIndex(
        userMembership?.index || null,
        next?.index || null
      );
    }
    return "";
  };
  const [reorderMonitor, dropToReorderRef] =
    useDropToReorderUserMembership(getIndex);

  const displayChildDocuments = expanded && !isDragging;

  if (documentId) {
    const document = documents.get(documentId);
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

    const node = document.asNavigationNode;
    const childDocuments = node.children;
    const hasChildDocuments = childDocuments.length > 0;

    return (
      <>
        <Draggable
          key={userMembership.id}
          ref={draggableRef}
          $isDragging={isDragging}
        >
          <SidebarLink
            depth={0}
            to={{
              pathname: document.path,
              state: { sharedWithMe: true },
            }}
            expanded={hasChildDocuments && !isDragging ? expanded : undefined}
            onDisclosureClick={handleDisclosureClick}
            icon={icon}
            isActive={(match, location: Location<{ sharedWithMe?: boolean }>) =>
              !!match && location.state?.sharedWithMe === true
            }
            label={label}
            exact={false}
            unreadBadge={
              document.unreadNotifications.filter(
                (notification) =>
                  notification.event === NotificationEventType.AddUserToDocument
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
        </Draggable>
        <Relative>
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
          {reorderMonitor.isDragging && (
            <DropCursor
              isActiveDrop={reorderMonitor.isOverCursor}
              innerRef={dropToReorderRef}
            />
          )}
        </Relative>
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
