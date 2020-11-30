// @flow
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
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
  const { documents } = useStores();
  const isActiveDocument = activeDocument && activeDocument.id === node.id;
  const hasChildDocuments = !!node.children.length;
  const [menuOpen, setMenuOpen] = React.useState(false);

  console.log("render");
  const document = documents.get(node.id);
  if (document) console.log(document.id);

  const title = node.title || "Untitled";

  const { fetchChildDocuments } = documents;

  React.useEffect(() => {
    if (isActiveDocument && hasChildDocuments) {
      fetchChildDocuments(node.id);
    }
  }, [fetchChildDocuments, node, hasChildDocuments, isActiveDocument]);

  const handleMouseEnter = React.useCallback(
    (ev: SyntheticEvent<>) => {
      prefetchDocument(node.id);
    },
    [prefetchDocument, node]
  );

  const handleTitleChange = React.useCallback(
    async (title: string) => {
      const document = documents.get(node.id);
      if (!document) return;

      await documents.update({
        id: document.id,
        lastRevision: document.revision,
        text: document.text,
        title,
      });
    },
    [documents, node]
  );

  const showChildren = React.useMemo(() => {
    return !!(
      hasChildDocuments &&
      activeDocument &&
      collection &&
      (collection
        .pathToDocument(activeDocument)
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

  return (
    <React.Fragment key={node.id}>
      <SidebarLink
        innerRef={isActiveDocument ? activeDocumentRef : undefined}
        onMouseEnter={handleMouseEnter}
        to={{
          pathname: node.url,
          state: { title: node.title },
        }}
        label={
          <DropToImport documentId={node.id} activeClassName="activeDropZone">
            {hasChildDocuments && (
              <Disclosure expanded={expanded} onClick={handleDisclosureClick} />
            )}
            <EditableTitle
              title={title}
              onSubmit={handleTitleChange}
              canUpdate={canUpdate}
            />
          </DropToImport>
        }
        depth={depth}
        exact={false}
        menuOpen={menuOpen}
        menu={
          document ? (
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
      ></SidebarLink>

      {expanded && (
        <>
          {node.children.map((childNode) => (
            <DocumentLink
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
    </React.Fragment>
  );
}

const Disclosure = styled(CollapsedIcon)`
  position: absolute;
  left: -24px;

  ${({ expanded }) => !expanded && "transform: rotate(-90deg);"};
`;

export default observer(DocumentLink);
