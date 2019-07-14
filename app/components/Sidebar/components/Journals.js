// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import Flex from 'shared/components/Flex';
import { PlusIcon } from 'outline-icons';

import Header from './Header';
import SidebarLink from './SidebarLink';
import CollectionLink from './CollectionLink';
import Fade from 'components/Fade';
import Modal from 'components/Modal';
import JournalNew from 'scenes/JournalNew';

import CollectionsStore from 'stores/CollectionsStore';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  collections: CollectionsStore,
  documents: DocumentsStore,
  ui: UiStore,
};

@observer
class Journals extends React.Component<Props> {
  isPreloaded: boolean = !!this.props.collections.orderedData.length;
  @observable createModalOpen: boolean = false;

  handleModalOpen = () => {
    this.createModalOpen = true;
  };

  handleModalClose = () => {
    this.createModalOpen = false;
  };

  render() {
    const { collections, ui, documents } = this.props;

    const content = (
      <Flex column>
        <Header>Journals</Header>
        {collections.journals.map(collection => (
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
          label="New journal…"
        />
        <Modal
          title="Create a journal"
          onRequestClose={this.handleModalClose}
          isOpen={this.createModalOpen}
        >
          <JournalNew onSubmit={this.handleModalClose} />
        </Modal>
      </Flex>
    );

    return (
      collections.isLoaded &&
      (this.isPreloaded ? content : <Fade>{content}</Fade>)
    );
  }
}

export default inject('collections', 'ui', 'documents')(withRouter(Journals));
