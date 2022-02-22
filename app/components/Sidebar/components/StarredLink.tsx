import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { StarredIcon } from "outline-icons";
import * as React from "react";
import { useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import styled, { useTheme } from "styled-components";
import parseTitle from "@shared/utils/parseTitle";
import Star from "~/models/Star";
import EmojiIcon from "~/components/EmojiIcon";
import Fade from "~/components/Fade";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import DropCursor from "./DropCursor";
import SidebarLink from "./SidebarLink";

type Props = {
  star?: Star;
  depth: number;
  title: string;
  to: string;
  documentId: string;
  collectionId: string;
};

function StarredLink({
  depth,
  to,
  documentId,
  title,
  collectionId,
  star,
}: Props) {
  const theme = useTheme();
  const { collections, documents } = useStores();
  const collection = collections.get(collectionId);
  const document = documents.get(documentId);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const childDocuments = collection
    ? collection.getDocumentChildren(documentId)
    : [];
  const hasChildDocuments = childDocuments.length > 0;

  useEffect(() => {
    async function load() {
      if (!document) {
        await documents.fetch(documentId);
      }
    }

    load();
  }, [collection, collectionId, collections, document, documentId, documents]);

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
    canDrag: () => {
      return depth === 2;
    },
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

  const { emoji } = parseTitle(title);
  const label = emoji ? title.replace(emoji, "") : title;

  return (
    <>
      <Draggable key={documentId} ref={drag} $isDragging={isDragging}>
        <SidebarLink
          depth={depth}
          expanded={hasChildDocuments ? expanded : undefined}
          onDisclosureClick={handleDisclosureClick}
          to={`${to}?starred`}
          icon={
            depth === 0 ? (
              emoji ? (
                <EmojiIcon emoji={emoji} />
              ) : (
                <StarredIcon color={theme.yellow} />
              )
            ) : undefined
          }
          isActive={(match, location) =>
            !!match && location.search === "?starred"
          }
          label={depth === 0 ? label : title}
          exact={false}
          showActions={menuOpen}
          menu={
            document ? (
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
        {isDraggingAny && (
          <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
        )}
      </Draggable>
      {expanded &&
        childDocuments.map((childDocument) => (
          <ObserveredStarredLink
            key={childDocument.id}
            depth={depth === 0 ? 2 : depth + 1}
            title={childDocument.title}
            to={childDocument.url}
            documentId={childDocument.id}
            collectionId={collectionId}
          />
        ))}
    </>
  );
}

const Draggable = styled.div<{ $isDragging?: boolean }>`
  position: relative;
  opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};
`;

const ObserveredStarredLink = observer(StarredLink);

export default ObserveredStarredLink;
