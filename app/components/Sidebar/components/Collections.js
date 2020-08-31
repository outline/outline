// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter, type RouterHistory } from 'react-router-dom';
import keydown from 'react-keydown';
import { DragDropContext } from 'react-beautiful-dnd';
import type { DropResult, BeforeCapture } from 'react-beautiful-dnd';
import { PlusIcon } from 'outline-icons';
import { newDocumentUrl } from 'utils/routeHelpers';
import {
  DROPPABLE_COLLECTION_SUFFIX,
  DROPPABLE_DOCUMENT_SUFFIX,
  DROPPABLE_DOCUMENT_SEPARATOR,
} from 'utils/dnd';

import Header from './Header';
import SidebarLink from './SidebarLink';
import CollectionLink from './CollectionLink';
import CollectionsLoading from './CollectionsLoading';

import CollectionsStore from 'stores/CollectionsStore';
import DocumentsStore from 'stores/DocumentsStore';
import PoliciesStore from 'stores/PoliciesStore';
import UiStore from 'stores/UiStore';
import Flex from 'components/Flex';
import Fade from 'components/Fade';

type SidebarDnDContextObject = {
  isDragging: boolean,
  draggingDocumentId?: string,
};

const initialSidebarDnDContextValue: SidebarDnDContextObject = {
  isDragging: false,
  draggingDocumentId: undefined,
};

//$FlowFixMe
export const SidebarDnDContext = React.createContext(
  initialSidebarDnDContextValue,
);

type Props = {
  history: RouterHistory,
  policies: PoliciesStore,
  collections: CollectionsStore,
  documents: DocumentsStore,
  onCreateCollection: () => void,
  ui: UiStore,
};

type State = {
  draggingDocumentId?: string,
  isDragging: boolean,
};

@observer
class Collections extends React.Component<Props, State> {
  state: State = {
    isDragging: false,
  };
  isPreloaded: boolean = !!this.props.collections.orderedData.length;

  componentDidMount() {
    const { collections } = this.props;

    if (!collections.isFetching && !collections.isLoaded) {
      collections.fetchPage({ limit: 100 });
    }
  }

  @keydown('n')
  goToNewDocument() {
    if (this.props.ui.editMode) return;

    const { activeCollectionId } = this.props.ui;
    if (!activeCollectionId) return;

    const can = this.props.policies.abilities(activeCollectionId);
    if (!can.update) return;

    this.props.history.push(newDocumentUrl(activeCollectionId));
  }

  getDroppableIdParts(droppableId: string) {
    let collection, parentDocumentId;
    const { collections } = this.props;

    if (droppableId.indexOf(DROPPABLE_COLLECTION_SUFFIX) === 0) {
      collection = collections.get(
        droppableId.substring(DROPPABLE_COLLECTION_SUFFIX.length),
      );
    } else if (
      droppableId.indexOf(DROPPABLE_DOCUMENT_SUFFIX) === 0 &&
      droppableId.indexOf(DROPPABLE_DOCUMENT_SEPARATOR)
    ) {
      const [documentId, collectionId] = droppableId
        .substring(DROPPABLE_DOCUMENT_SUFFIX.length)
        .split(DROPPABLE_DOCUMENT_SEPARATOR);

      parentDocumentId = documentId;

      collection = collections.get(collectionId);
    }

    return {
      collection,
      parentDocumentId,
    };
  }

  handleBeforeCapture = (before: BeforeCapture) => {
    this.setState({
      isDragging: true,
      draggingDocumentId: before.draggableId,
    });
  };

  reorder = (result: DropResult) => {
    this.setState({
      isDragging: false,
      draggingDocumentId: undefined,
    });

    // Bail out early if result doesn't have a destination or combine data
    if (!result.destination && !result.combine) {
      return;
    }

    // Bail out early if no changes
    if (
      (result.destination &&
        result.destination.droppableId === result.source.droppableId &&
        result.destination.index === result.source.index) ||
      (result.combine && result.combine.draggableId === result.draggableId)
    ) {
      return;
    }

    const { documents } = this.props;
    const document = documents.get(result.draggableId);
    let collection,
      parentDocumentId,
      index = 0;

    // Bail out if document doesn't exist
    if (!document) {
      return;
    }

    if (result.destination) {
      index = result.destination.index;
      const droppableId = result.destination.droppableId;
      const parts = this.getDroppableIdParts(droppableId);

      collection = parts.collection;
      parentDocumentId = parts.parentDocumentId;
    } else if (result.combine) {
      const { draggableId, droppableId } = result.combine;
      const parts = this.getDroppableIdParts(droppableId);

      collection = parts.collection;
      parentDocumentId = draggableId;
    }

    // Bail out if collection doesn't exist
    if (!collection) {
      return;
    }

    if (parentDocumentId) {
      // Bail out if moving document to itself
      if (parentDocumentId === document.id) {
        return;
      }

      const parentDocument = documents.get(parentDocumentId);

      // Bail out if parent document doesn't exist
      if (!parentDocument) {
        return;
      }
    }

    documents.move(document, collection.id, parentDocumentId, index);
  };

  render() {
    const { collections, ui, documents } = this.props;
    const { draggingDocumentId, isDragging } = this.state;

    const content = (
      <React.Fragment>
        <DragDropContext
          onBeforeCapture={this.handleBeforeCapture}
          onDragEnd={this.reorder}
        >
          <SidebarDnDContext.Provider
            value={{
              draggingDocumentId,
              isDragging,
            }}
          >
            {collections.orderedData.map((collection) => (
              <CollectionLink
                key={collection.id}
                documents={documents}
                collection={collection}
                activeDocument={documents.active}
                prefetchDocument={documents.prefetchDocument}
                ui={ui}
              />
            ))}
            <div id="sidebar-collections-portal" />
          </SidebarDnDContext.Provider>
        </DragDropContext>
        <SidebarLink
          to="/collections"
          onClick={this.props.onCreateCollection}
          icon={<PlusIcon color="currentColor" />}
          label="New collection…"
          exact
        />
      </React.Fragment>
    );

    return (
      <Flex column>
        <Header>Collections</Header>
        {collections.isLoaded ? (
          this.isPreloaded ? (
            content
          ) : (
            <Fade>{content}</Fade>
          )
        ) : (
          <CollectionsLoading />
        )}
      </Flex>
    );
  }
}

export default inject(
  'collections',
  'ui',
  'documents',
  'policies',
)(withRouter(Collections));
