import fractionalIndex from "fractional-index";
import { Location } from "history";
import { observer } from "mobx-react";
import { StarredIcon } from "outline-icons";
import * as React from "react";
import { useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useLocation } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import parseTitle from "@shared/utils/parseTitle";
import Star from "~/models/Star";
import EmojiIcon from "~/components/EmojiIcon";
import Fade from "~/components/Fade";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import CollectionLink from "./CollectionLink";
import CollectionLinkChildren from "./CollectionLinkChildren";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";

type Props = {
  star: Star;
};

function useLocationStateStarred() {
  const location = useLocation<{
    starred?: boolean;
  }>();
  return location.state?.starred;
}

function StarredLink({ star }: Props) {
  const theme = useTheme();
  const { ui, collections, documents } = useStores();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { documentId, collectionId } = star;
  const collection = collections.get(collectionId);
  const locationStateStarred = useLocationStateStarred();
  const [expanded, setExpanded] = useState(
    star.collectionId === ui.activeCollectionId && !!locationStateStarred
  );

  React.useEffect(() => {
    if (star.collectionId === ui.activeCollectionId && locationStateStarred) {
      setExpanded(true);
    }
  }, [star.collectionId, ui.activeCollectionId, locationStateStarred]);

  useEffect(() => {
    async function load() {
      if (documentId) {
        await documents.fetch(documentId);
      }
    }

    load();
  }, [documentId, documents]);

  const handleDisclosureClick = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded((prevExpanded) => !prevExpanded);
    },
    []
  );

  // Draggable
  const [{ isDragging }, drag] = useDrag({
    type: "star",
    item: () => star,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => true,
  });

  // Drop to reorder
  const [{ isOverReorder, isDraggingAny }, dropToReorder] = useDrop({
    accept: "star",
    drop: (item: Star) => {
      const next = star?.next();

      item?.save({
        index: fractionalIndex(star?.index || null, next?.index || null),
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

    const collection = collections.get(document.collectionId);
    const { emoji } = parseTitle(document.title);
    const label = emoji
      ? document.title.replace(emoji, "")
      : document.titleWithDefault;
    const childDocuments = collection
      ? collection.getDocumentChildren(documentId)
      : [];
    const hasChildDocuments = childDocuments.length > 0;

    return (
      <>
        <Draggable key={star.id} ref={drag} $isDragging={isDragging}>
          <SidebarLink
            depth={0}
            to={{
              pathname: document.url,
              state: { starred: true },
            }}
            expanded={hasChildDocuments && !isDragging ? expanded : undefined}
            onDisclosureClick={handleDisclosureClick}
            icon={
              emoji ? (
                <EmojiIcon emoji={emoji} />
              ) : (
                <StarredIcon color={theme.yellow} />
              )
            }
            isActive={(match, location: Location<{ starred?: boolean }>) =>
              !!match && location.state?.starred === true
            }
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

  if (collection) {
    return (
      <>
        <Draggable key={star?.id} ref={drag} $isDragging={isDragging}>
          <CollectionLink
            collection={collection}
            expanded={isDragging ? undefined : displayChildDocuments}
            activeDocument={documents.active}
            onDisclosureClick={handleDisclosureClick}
            isDraggingAnyCollection={isDraggingAny}
          />
        </Draggable>
        <Relative>
          <CollectionLinkChildren
            collection={collection}
            expanded={displayChildDocuments}
          />
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
  opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};
`;

export default observer(StarredLink);
