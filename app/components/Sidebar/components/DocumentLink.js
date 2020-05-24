// @flow
import * as React from 'react';
import { observer, Observer } from 'mobx-react';
import { observable } from 'mobx';
import styled from 'styled-components';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import Document from 'models/Document';
import DocumentMenu from 'menus/DocumentMenu';
import SidebarLink from './SidebarLink';
import DropToImport from 'components/DropToImport';
import Fade from 'components/Fade';
import Collection from 'models/Collection';
import DocumentsStore from 'stores/DocumentsStore';
import Flex from 'shared/components/Flex';
import { type NavigationNode } from 'types';

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
    return !!this.props.node.children.length;
  };

  reorder = (result: DropResult) => {
    // Bail out early if result doesn't have a destination data
    if (!result.destination) {
      return;
    }

    // Bail out early if no changes
    if (
      result.destination.droppableId === result.source.droppableId &&
      result.destination.index === result.source.index
    ) {
      return;
    }

    const { collection, node, documents } = this.props;
    const document = node.children.find(({ id }) => id === result.draggableId);

    // Bail out if document doesn't exist
    if (!document) {
      return;
    }

    documents.move(
      documents.get(document.id),
      collection.id,
      node.id,
      result.destination.index
    );
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
        .map(entry => entry.id)
        .includes(node.id) ||
        this.isActiveDocument())
    );
    const document = documents.get(node.id);

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
            label={node.title}
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
            {this.hasChildDocuments() && (
              <DragDropContext onDragEnd={this.reorder}>
                <Droppable droppableId={`droppable-document-${node.id}`}>
                  {(provided, snapshot) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      <DocumentChildren column>
                        <Observer>
                          {() =>
                            node.children.map((childNode, index) => (
                              <Draggable
                                key={childNode.id}
                                draggableId={childNode.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
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
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))
                          }
                        </Observer>
                      </DocumentChildren>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </SidebarLink>
        </DropToImport>
      </Flex>
    );
  }
}

const DocumentChildren = styled(Flex)``;

export default DocumentLink;
