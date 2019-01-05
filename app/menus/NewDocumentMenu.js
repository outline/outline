// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { inject } from 'mobx-react';
import { MoreIcon, CollectionIcon, PrivateCollectionIcon } from 'outline-icons';

import { newDocumentUrl } from 'utils/routeHelpers';
import CollectionsStore from 'stores/CollectionsStore';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  label?: React.Node,
  history: Object,
  collections: CollectionsStore,
};

class NewDocumentMenu extends React.Component<Props> {
  handleNewDocument = collection => {
    this.props.history.push(newDocumentUrl(collection));
  };

  onOpen = () => {
    const { collections } = this.props;

    if (collections.orderedData.length === 1) {
      this.handleNewDocument(collections.orderedData[0]);
    }
  };

  render() {
    const { collections, label, history, ...rest } = this.props;

    return (
      <DropdownMenu
        label={label || <MoreIcon />}
        onOpen={this.onOpen}
        {...rest}
      >
        <DropdownMenuItem disabled>Choose a collection…</DropdownMenuItem>
        {collections.orderedData.map(collection => (
          <DropdownMenuItem
            key={collection.id}
            onClick={() => this.handleNewDocument(collection)}
          >
            {collection.private ? (
              <PrivateCollectionIcon color={collection.color} />
            ) : (
              <CollectionIcon color={collection.color} />
            )}{' '}
            {collection.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>
    );
  }
}

export default withRouter(inject('collections')(NewDocumentMenu));
