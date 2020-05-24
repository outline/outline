// @flow
import * as React from 'react';
import { observer, Observer } from 'mobx-react';
import { observable } from 'mobx';
import { CollectionIcon, PrivateCollectionIcon } from 'outline-icons';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import Collection from 'models/Collection';
import Document from 'models/Document';
import CollectionMenu from 'menus/CollectionMenu';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';
import SidebarLink from './SidebarLink';
import DocumentLink from './DocumentLink';
import DropToImport from 'components/DropToImport';
import Flex from 'shared/components/Flex';

type Props = {
  collection: Collection,
  ui: UiStore,
  documents: DocumentsStore,
  activeDocument: ?Document,
  prefetchDocument: (id: string) => Promise<void>,
};

@observer
class CollectionLink extends React.Component<Props> {
  @observable menuOpen = false;

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

    const { collection, documents } = this.props;
    const document = collection.documents.find(
      ({ id }) => id === result.draggableId
    );

    // Bail out if document doesn't exist
    if (!document) {
      return;
    }

    documents.move(
      documents.get(document.id),
      collection.id,
      undefined,
      result.destination.index
    );
  };

  render() {
    const {
      collection,
      documents,
      activeDocument,
      prefetchDocument,
      ui,
    } = this.props;
    const expanded = collection.id === ui.activeCollectionId;

    return (
      <DropToImport
        key={collection.id}
        collectionId={collection.id}
        activeClassName="activeDropZone"
      >
        <SidebarLink
          key={collection.id}
          to={collection.url}
          icon={
            collection.private ? (
              <PrivateCollectionIcon
                expanded={expanded}
                color={collection.color}
              />
            ) : (
              <CollectionIcon expanded={expanded} color={collection.color} />
            )
          }
          iconColor={collection.color}
          expanded={expanded}
          hideDisclosure
          menuOpen={this.menuOpen}
          label={collection.name}
          exact={false}
          menu={
            <CollectionMenu
              position="right"
              collection={collection}
              onOpen={() => (this.menuOpen = true)}
              onClose={() => (this.menuOpen = false)}
            />
          }
        >
          <DragDropContext onDragEnd={this.reorder}>
            <Droppable droppableId={`droppable-collection-${collection.id}`}>
              {(provided, snapshot) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  <Flex column>
                    <Observer>
                      {() =>
                        collection.documents.map((node, index) => (
                          <Draggable
                            key={node.id}
                            draggableId={node.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <DocumentLink
                                  key={node.id}
                                  node={node}
                                  documents={documents}
                                  collection={collection}
                                  activeDocument={activeDocument}
                                  prefetchDocument={prefetchDocument}
                                  depth={1.5}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      }
                    </Observer>
                  </Flex>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </SidebarLink>
      </DropToImport>
    );
  }
}

export default CollectionLink;
