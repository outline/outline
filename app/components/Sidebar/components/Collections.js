// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import keydown from 'react-keydown';
import { PlusIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';
import { newDocumentUrl } from 'utils/routeHelpers';

import Header from './Header';
import SidebarLink from './SidebarLink';
import CollectionLink from './CollectionLink';
import Modal from 'components/Modal';
import Fade from 'components/Fade';
import CollectionNew from 'scenes/CollectionNew';

import CollectionsStore from 'stores/CollectionsStore';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  history: Object,
  collections: CollectionsStore,
  documents: DocumentsStore,
  ui: UiStore,
};

@observer
class Collections extends React.Component<Props> {
  isPreloaded: boolean = !!this.props.collections.orderedData.length;
  @observable createModalOpen: boolean = false;

  handleModalOpen = () => {
    this.createModalOpen = true;
  };

  handleModalClose = () => {
    this.createModalOpen = false;
  };

  componentDidMount() {
    this.props.collections.fetchPage({ limit: 100 });
  }

  @keydown('n')
  goToNewDocument() {
    const { activeCollectionId } = this.props.ui;
    if (!activeCollectionId) return;

    this.props.history.push(newDocumentUrl(activeCollectionId));
  }

  render() {
    const { collections, ui, documents } = this.props;

    const content = (
      <Flex column>
        <Header>Collections</Header>
        {collections.atlases.map(collection => (
          <CollectionLink
            key={collection.id}
            documents={documents}
            collection={collection}
            activeDocument={documents.active}
            prefetchDocument={documents.prefetchDocument}
            ui={ui}
          />
        ))}
        <SidebarLink
          onClick={this.handleModalOpen}
          icon={<PlusIcon />}
          label="New collection…"
        />
        <Modal
          title="Create a collection"
          onRequestClose={this.handleModalClose}
          isOpen={this.createModalOpen}
        >
          <CollectionNew onSubmit={this.handleModalClose} type="collection" />
        </Modal>
      </Flex>
    );

    return (
      collections.isLoaded &&
      (this.isPreloaded ? content : <Fade>{content}</Fade>)
    );
  }
}

export default inject('collections', 'ui', 'documents')(
  withRouter(Collections)
);
