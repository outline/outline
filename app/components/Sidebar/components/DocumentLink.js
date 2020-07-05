// @flow
import * as React from "react";
import { observer, Observer } from "mobx-react";
import { observable } from "mobx";
import styled from "styled-components";
import { Draggable } from "react-beautiful-dnd";
import Document from "models/Document";
import DocumentMenu from "menus/DocumentMenu";
import SidebarLink from "./SidebarLink";
import Droppable from "./Droppable";
import DropToImport from "components/DropToImport";
import Fade from "components/Fade";
import Collection from "models/Collection";
import DocumentsStore from "stores/DocumentsStore";
import Flex from "shared/components/Flex";
import { type NavigationNode } from "types";
import { DraggingDocumentIdContext } from "./Collections";

type Props = {
  node: NavigationNode,
  documents: DocumentsStore,
  collection?: Collection,
  activeDocument: ?Document,
  activeDocumentRef?: (?HTMLElement) => void,
  prefetchDocument: (documentId: string) => Promise<void>,
  depth: number,
  isDropDisabled?: boolean,
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
    return !!this.props.node.children.length;
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
      isDropDisabled,
    } = this.props;

    const showChildren = !!(
      activeDocument &&
      collection &&
      (collection
        .pathToDocument(activeDocument)
        .map(entry => entry.id)
        .includes(node.id) ||
        this.isActiveDocument())
    );
    const document = documents.get(node.id);

    let hideDisclosure;
    if (!this.hasChildDocuments()) {
      hideDisclosure = true;
    }

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
            hideDisclosure={hideDisclosure}
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
              ) : (
                undefined
              )
            }
          >
            <DraggingDocumentIdContext.Consumer>
              {draggingDocumentId => {
                const disableChildDrops =
                  isDropDisabled || draggingDocumentId === node.id;

                return (
                  <Droppable
                    collectionId={collection.id}
                    documentId={node.id}
                    isDropDisabled={disableChildDrops}
                  >
                    {this.hasChildDocuments() && (
                      <DocumentChildren column>
                        <Observer>
                          {() =>
                            node.children.map((childNode, index) => (
                              <Draggable
                                key={childNode.id}
                                draggableId={childNode.id}
                                index={index}
                              >
                                {provided => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    <DocumentLink
                                      key={childNode.id}
                                      collection={collection}
                                      node={childNode}
                                      documents={documents}
                                      activeDocument={activeDocument}
                                      prefetchDocument={prefetchDocument}
                                      depth={depth + 1}
                                      isDropDisabled={disableChildDrops}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))
                          }
                        </Observer>
                      </DocumentChildren>
                    )}
                  </Droppable>
                );
              }}
            </DraggingDocumentIdContext.Consumer>
          </SidebarLink>
        </DropToImport>
      </Flex>
    );
  }
}

const DocumentChildren = styled(Flex)``;

export default DocumentLink;
