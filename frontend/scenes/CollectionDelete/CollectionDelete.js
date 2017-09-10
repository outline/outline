// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { homeUrl } from 'utils/routeHelpers';
import Button from 'components/Button';
import Flex from 'components/Flex';
import HelpText from 'components/HelpText';
import Collection from 'models/Collection';
import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  history: Object,
  collection: Collection,
  collections: CollectionsStore,
  onSubmit: () => void,
};

@observer class CollectionDelete extends Component {
  props: Props;
  @observable isDeleting: boolean;

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.isDeleting = true;
    const success = await this.props.collection.delete();

    if (success) {
      this.props.collections.remove(this.props.collection.id);
      this.props.history.push(homeUrl());
      this.props.onSubmit();
    }

    this.isDeleting = false;
  };

  render() {
    const { collection } = this.props;

    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Are you sure? Deleting the
            {' '}
            <strong>{collection.name}</strong>
            {' '}
            collection is permanant and will also delete all of the documents within
            it, so be careful with that.
          </HelpText>
          <Button type="submit" danger>
            {this.isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default CollectionDelete;
