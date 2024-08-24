import fractionalIndex from "fractional-index";
import { Location } from "history";
import { observer } from "mobx-react";
import { StarredIcon } from "outline-icons";
import * as React from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Star from "~/models/Star";
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
import {
  useDragStar,
  useDropToCreateStar,
  useDropToReorderStar,
} from "./useDragAndDrop";
import { useSidebarLabelAndIcon } from "./useSidebarLabelAndIcon";

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

  const getIndex = () => {
    const next = star?.next();
    return fractionalIndex(star?.index || null, next?.index || null);
  };
  const { label, icon } = useSidebarLabelAndIcon(
    star,
    <StarredIcon color={theme.yellow} />
  );
  const [{ isDragging }, draggableRef] = useDragStar(star);
  const [reorderStarMonitor, dropToReorderRef] = useDropToReorderStar(getIndex);
  const [createStarMonitor, dropToStarRef] = useDropToCreateStar(getIndex);

  const displayChildDocuments = expanded && !isDragging;

  const cursor = (
    <>
      {reorderStarMonitor.isDragging && (
        <DropCursor
          isActiveDrop={reorderStarMonitor.isOverCursor}
          innerRef={dropToReorderRef}
        />
      )}
      {createStarMonitor.isDragging && (
        <DropCursor
          isActiveDrop={createStarMonitor.isOverCursor}
          innerRef={dropToStarRef}
        />
      )}
    </>
  );

  if (documentId) {
    const document = documents.get(documentId);
    if (!document) {
      return null;
    }

    const collection = document.collectionId
      ? collections.get(document.collectionId)
      : undefined;
    const childDocuments = collection
      ? collection.getDocumentChildren(documentId)
      : [];
    const hasChildDocuments = childDocuments.length > 0;

    return (
      <>
        <Draggable key={star.id} ref={draggableRef} $isDragging={isDragging}>
          <SidebarLink
            depth={0}
            to={{
              pathname: document.url,
              state: { starred: true },
            }}
            expanded={hasChildDocuments && !isDragging ? expanded : undefined}
            onDisclosureClick={handleDisclosureClick}
            icon={icon}
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
          {cursor}
        </Relative>
      </>
    );
  }

  if (collection) {
    return (
      <>
        <Draggable key={star?.id} ref={draggableRef} $isDragging={isDragging}>
          <CollectionLink
            collection={collection}
            expanded={isDragging ? undefined : displayChildDocuments}
            activeDocument={documents.active}
            onDisclosureClick={handleDisclosureClick}
            isDraggingAnyCollection={reorderStarMonitor.isDragging}
          />
        </Draggable>
        <Relative>
          <CollectionLinkChildren
            collection={collection}
            expanded={displayChildDocuments}
          />
          {cursor}
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

export default observer(StarredLink);
