// @flow
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useDrag, useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Collection from "models/Collection";
import Document from "models/Document";
import DropToImport from "components/DropToImport";
import Fade from "components/Fade";
import EditableTitle from "./EditableTitle";
import SidebarLink from "./SidebarLink";
import useStores from "hooks/useStores";
import DocumentMenu from "menus/DocumentMenu";
import { type NavigationNode } from "types";

type Props = {|
  node: NavigationNode,
  canUpdate: boolean,
  collection?: Collection,
  activeDocument: ?Document,
  activeDocumentRef?: (?HTMLElement) => void,
  prefetchDocument: (documentId: string) => Promise<void>,
  depth: number,
|};

function DocumentLink({
  node,
  collection,
  activeDocument,
  activeDocumentRef,
  prefetchDocument,
  depth,
  canUpdate,
}: Props) {
  const { documents, policies } = useStores();
  const { t } = useTranslation();

  const isActiveDocument = activeDocument && activeDocument.id === node.id;
  const hasChildDocuments = !!node.children.length;

  const document = documents.get(node.id);
  const { fetchChildDocuments } = documents;

  React.useEffect(() => {
    if (isActiveDocument && hasChildDocuments) {
      fetchChildDocuments(node.id);
    }
  }, [fetchChildDocuments, node, hasChildDocuments, isActiveDocument]);

  const pathToNode = React.useMemo(
    () =>
      collection && collection.pathToDocument(node.id).map((entry) => entry.id),
    [collection, node]
  );

  const showChildren = React.useMemo(() => {
    return !!(
      hasChildDocuments &&
      activeDocument &&
      collection &&
      (collection
        .pathToDocument(activeDocument.id)
        .map((entry) => entry.id)
        .includes(node.id) ||
        isActiveDocument)
    );
  }, [hasChildDocuments, activeDocument, isActiveDocument, node, collection]);

  const [expanded, setExpanded] = React.useState(showChildren);

  React.useEffect(() => {
    if (showChildren) {
      setExpanded(showChildren);
    }
  }, [showChildren]);

  const handleDisclosureClick = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded(!expanded);
    },
    [expanded]
  );

  const handleMouseEnter = React.useCallback(
    (ev: SyntheticEvent<>) => {
      prefetchDocument(node.id);
    },
    [prefetchDocument, node]
  );

  const handleTitleChange = React.useCallback(
    async (title: string) => {
      if (!document) return;

      await documents.update({
        id: document.id,
        lastRevision: document.revision,
        text: document.text,
        title,
      });
    },
    [documents, document]
  );

  const [menuOpen, setMenuOpen] = React.useState(false);
  const isMoving = documents.movingDocumentId === node.id;

  // Draggable
  const [{ isDragging }, drag] = useDrag({
    item: { type: "document", ...node, depth, active: isActiveDocument },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: (monitor) => {
      return policies.abilities(node.id).move;
    },
  });

  // Droppable
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "document",
    drop: async (item, monitor) => {
      if (!collection) return;
      documents.move(item.id, collection.id, node.id);
    },
    canDrop: (item, monitor) =>
      pathToNode && !pathToNode.includes(monitor.getItem().id),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <>
      <Draggable
        key={node.id}
        ref={drag}
        $isDragging={isDragging}
        $isMoving={isMoving}
      >
        <div ref={drop}>
          <DropToImport documentId={node.id} activeClassName="activeDropZone">
            <SidebarLink
              innerRef={isActiveDocument ? activeDocumentRef : undefined}
              onMouseEnter={handleMouseEnter}
              to={{
                pathname: node.url,
                state: { title: node.title },
              }}
              label={
                <>
                  {hasChildDocuments && (
                    <Disclosure
                      expanded={expanded && !isDragging}
                      onClick={handleDisclosureClick}
                    />
                  )}
                  <EditableTitle
                    title={node.title || t("Untitled")}
                    onSubmit={handleTitleChange}
                    canUpdate={canUpdate}
                  />
                </>
              }
              isActiveDrop={isOver && canDrop}
              depth={depth}
              exact={false}
              menuOpen={menuOpen}
              menu={
                document && !isMoving ? (
                  <Fade>
                    <DocumentMenu
                      position="right"
                      document={document}
                      onOpen={() => setMenuOpen(true)}
                      onClose={() => setMenuOpen(false)}
                    />
                  </Fade>
                ) : undefined
              }
            />
          </DropToImport>
        </div>
      </Draggable>

      {expanded && !isDragging && (
        <>
          {node.children.map((childNode) => (
            <ObservedDocumentLink
              key={childNode.id}
              collection={collection}
              node={childNode}
              activeDocument={activeDocument}
              prefetchDocument={prefetchDocument}
              depth={depth + 1}
              canUpdate={canUpdate}
            />
          ))}
        </>
      )}
    </>
  );
}

const Draggable = styled("div")`
  opacity: ${(props) => (props.$isDragging || props.$isMoving ? 0.5 : 1)};
  pointer-events: ${(props) => (props.$isMoving ? "none" : "all")};
`;

const Disclosure = styled(CollapsedIcon)`
  position: absolute;
  left: -24px;

  ${({ expanded }) => !expanded && "transform: rotate(-90deg);"};
`;

const ObservedDocumentLink = observer(DocumentLink);
export default ObservedDocumentLink;
