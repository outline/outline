// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Redirect } from 'react-router';
import _ from 'lodash';

import CollectionsStore from 'stores/CollectionsStore';
import CollectionStore from './CollectionStore';

import Layout from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import PreviewLoading from 'components/PreviewLoading';

type Props = {
  collections: CollectionsStore,
  match: Object,
};

@observer class Collection extends React.Component {
  props: Props;
  store: CollectionStore;

  constructor(props) {
    super(props);
    this.store = new CollectionStore();
  }

  componentDidMount = () => {
    const { id } = this.props.match.params;
    this.store.fetchCollection(id);
  };

  render() {
    return (
      <Layout>
        {this.store.redirectUrl
          ? <Redirect to={this.store.redirectUrl} />
          : <CenteredContent>
              <PreviewLoading />
            </CenteredContent>}
      </Layout>
    );
  }
}
export default inject('collections')(Collection);
