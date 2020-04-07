// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter, type RouterHistory } from 'react-router-dom';
import keydown from 'react-keydown';
import Flex from 'shared/components/Flex';
import { PlusIcon } from 'outline-icons';
import { newDocumentUrl } from 'utils/routeHelpers';

import Header from './Header';
import SidebarLink from './SidebarLink';
import CollectionLink from './CollectionLink';
import Fade from 'components/Fade';

import CollectionsStore from 'stores/CollectionsStore';
import PoliciesStore from 'stores/PoliciesStore';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  history: RouterHistory,
  policies: PoliciesStore,
  collections: CollectionsStore,
  documents: DocumentsStore,
  onCreateCollection: () => void,
  ui: UiStore,
};

@observer
class Collections extends React.Component<Props> {
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

  render() {
    const { collections, ui, documents } = this.props;

    const content = (
      <Flex column>
        <Header>Collections</Header>
        {collections.orderedData.map(collection => (
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
          to="/collections"
          onClick={this.props.onCreateCollection}
          icon={<PlusIcon />}
          label="New collection…"
          exact
        />
      </Flex>
    );

    return (
      collections.isLoaded &&
      (this.isPreloaded ? content : <Fade>{content}</Fade>)
    );
  }
}

export default inject('collections', 'ui', 'documents', 'policies')(
  withRouter(Collections)
);
