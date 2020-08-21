// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import { EditIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import DocumentsStore from "stores/DocumentsStore";
import Collection from "models/Collection";
import Document from "models/Document";
import DropToImport from "components/DropToImport";
import Fade from "components/Fade";
import Flex from "components/Flex";
import SidebarLink from "./SidebarLink";
import DocumentMenu from "menus/DocumentMenu";
import { type NavigationNode } from "types";

type Props = {
  node: NavigationNode,
  documents: DocumentsStore,
  collection?: Collection,
  activeDocument: ?Document,
  activeDocumentRef?: (?HTMLElement) => void,
  prefetchDocument: (documentId: string) => Promise<void>,
  depth: number,
};

@observer
class DocumentLink extends React.Component<Props> {
  @observable menuOpen = false;

  componentDidMount() {
    if (this.isActiveDocument() && this.hasChildDocuments()) {
      this.props.documents.fetchChildDocuments(this.props.node.id);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.activeDocument !== this.props.activeDocument) {
      if (this.isActiveDocument() && this.hasChildDocuments()) {
        this.props.documents.fetchChildDocuments(this.props.node.id);
      }
    }
  }

  handleMouseEnter = (ev: SyntheticEvent<>) => {
    const { node, prefetchDocument } = this.props;

    ev.stopPropagation();
    ev.preventDefault();
    prefetchDocument(node.id);
  };

  isActiveDocument = () => {
    return (
      this.props.activeDocument &&
      this.props.activeDocument.id === this.props.node.id
    );
  };

  hasChildDocuments = () => {
    return !!this.props.node.children?.length;
  };

  render() {
    const {
      node,
      documents,
      collection,
      activeDocument,
      activeDocumentRef,
      prefetchDocument,
      depth,
    } = this.props;

    const showChildren = !!(
      activeDocument &&
      collection &&
      (collection
        .pathToDocument(activeDocument)
        .map((entry) => entry.id)
        .includes(node.id) ||
        this.isActiveDocument())
    );
    const document = documents.get(node.id);

    const draftDocuments = documents
      .draftsInCollection(collection.id)
      .filter(
        (_document) =>
          !!_document.parentDocumentId && _document.parentDocumentId === node.id
      );
    const hasDraftDocuments = !!draftDocuments.length;

    return (
      <Flex
        column
        key={node.id}
        ref={this.isActiveDocument() ? activeDocumentRef : undefined}
        onMouseEnter={this.handleMouseEnter}
      >
        <DropToImport documentId={node.id} activeClassName="activeDropZone">
          <SidebarLink
            to={{
              pathname: node.url,
              state: { title: node.title },
            }}
            expanded={showChildren ? true : undefined}
            label={node.title || "Untitled"}
            depth={depth}
            exact={false}
            menuOpen={this.menuOpen}
            menu={
              document ? (
                <Fade>
                  <DocumentMenu
                    position="right"
                    document={document}
                    onOpen={() => (this.menuOpen = true)}
                    onClose={() => (this.menuOpen = false)}
                  />
                </Fade>
              ) : undefined
            }
          >
            {(this.hasChildDocuments(draftDocuments) || hasDraftDocuments) && (
              <DocumentChildren column>
                {hasDraftDocuments &&
                  draftDocuments.map((document) => (
                    <SidebarLink
                      // ref={!!activeDocument && activeDocument.id === document.id ? activeDocumentRef : undefined}
                      key={document.id}
                      to={document.url}
                      icon={<EditIcon color="currentColor" />}
                      label={document.title}
                      depth={depth + 1}
                      active={
                        !!activeDocument && activeDocument.id === document.id
                      }
                      exact
                    />
                  ))}
                {node.children.map((childNode) => (
                  <DocumentLink
                    key={childNode.id}
                    collection={collection}
                    node={childNode}
                    documents={documents}
                    activeDocument={activeDocument}
                    prefetchDocument={prefetchDocument}
                    depth={depth + 1}
                  />
                ))}
              </DocumentChildren>
            )}
          </SidebarLink>
        </DropToImport>
      </Flex>
    );
  }
}

const DocumentChildren = styled(Flex)``;

export default DocumentLink;
