// @flow
import { observable, Observer } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';
import Collection from 'models/Collection';
import Document from 'models/Document';
import CollectionIcon from 'components/CollectionIcon';
import DropToImport from 'components/DropToImport';
import Droppable from './Droppable';
import Draggable from './Draggable';
import { SidebarDnDContext } from './Collections';
import Flex from 'components/Flex';
import DocumentLink from './DocumentLink';
import SidebarLink from './SidebarLink';
import CollectionMenu from 'menus/CollectionMenu';

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
        <SidebarDnDContext.Consumer>
          {({ draggingDocumentId, isDragging }) => (
            <Droppable collectionId={collection.id}>
              {(provided, snapshot) => (
                <SidebarLink
                  key={collection.id}
                  to={collection.url}
                  icon={
                    <CollectionIcon
                      collection={collection}
                      expanded={expanded}
                    />
                  }
                  iconColor={collection.color}
                  expanded={
                    isDragging ? expanded || snapshot.isDraggingOver : expanded
                  }
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
                  <Flex column>
                    <Observer>
                      {() =>
                        collection.documents.map((node, index) => (
                          <Draggable
                            key={node.id}
                            draggableId={node.id}
                            index={index}
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
                          </Draggable>
                        ))
                      }
                    </Observer>
                  </Flex>
                </SidebarLink>
              )}
            </Droppable>
          )}
        </SidebarDnDContext.Consumer>
      </DropToImport>
    );
  }
}

export default CollectionLink;
