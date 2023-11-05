import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import { useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import styled, { useTheme } from "styled-components";
import UserMembership from "~/models/UserMembership";
import Fade from "~/components/Fade";
import EmojiIcon from "~/components/Icons/EmojiIcon";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";

type Props = {
  userMembership: UserMembership;
};

function useLabelAndIcon({ documentId }: UserMembership) {
  const { documents } = useStores();
  const theme = useTheme();

  const document = documents.get(documentId!);

  return {
    label: document?.titleWithDefault,
    icon: document?.emoji ? (
      <EmojiIcon emoji={document.emoji} />
    ) : (
      <DocumentIcon color={theme.textSecondary} />
    ),
  };
}

function SharedWithMeLink({ userMembership }: Props) {
  const { ui, collections, documents } = useStores();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { documentId } = userMembership;
  const [expanded, setExpanded] = useState(
    userMembership.documentId === ui.activeDocumentId
  );

  React.useEffect(() => {
    if (userMembership.documentId === ui.activeDocumentId) {
      setExpanded(true);
    }
  }, [userMembership.documentId, ui.activeDocumentId]);

  useEffect(() => {
    if (documentId) {
      void documents.fetch(documentId);
    }
  }, [documentId, documents]);

  const handleDisclosureClick = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded((prevExpanded) => !prevExpanded);
    },
    []
  );

  const { label, icon } = useLabelAndIcon(userMembership);

  // Draggable
  const [{ isDragging }, drag, preview] = useDrag({
    type: "userMembership",
    item: () => ({
      userMembership,
      title: label,
      icon,
    }),
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => true,
  });

  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  // Drop to reorder
  const [{ isOverReorder, isDraggingAny }, dropToReorder] = useDrop({
    accept: "userMembership",
    drop: (item: { userMembership: UserMembership }) => {
      const next = userMembership?.next();

      void item.userMembership.save({
        index: fractionalIndex(
          userMembership?.index || null,
          next?.index || null
        ),
      });
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
      isDraggingAny: !!monitor.canDrop(),
    }),
  });

  const displayChildDocuments = expanded && !isDragging;

  if (documentId) {
    const document = documents.get(documentId);
    if (!document) {
      return null;
    }

    const { emoji } = document;
    const label = emoji
      ? document.title.replace(emoji, "")
      : document.titleWithDefault;
    const collection = document.collectionId
      ? collections.get(document.collectionId)
      : undefined;
    const childDocuments = collection
      ? collection.getDocumentChildren(documentId)
      : [];
    const hasChildDocuments = childDocuments.length > 0;

    return (
      <>
        <Draggable key={userMembership.id} ref={drag} $isDragging={isDragging}>
          <SidebarLink
            depth={0}
            to={{
              pathname: document.url,
              state: { starred: true },
            }}
            expanded={hasChildDocuments && !isDragging ? expanded : undefined}
            onDisclosureClick={handleDisclosureClick}
            icon={icon}
            label={label}
            exact={false}
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
          {isDraggingAny && (
            <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
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
