// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Redirect } from 'react-router';
import _ from 'lodash';
import { notFoundUrl } from 'utils/routeHelpers';

import CollectionsStore from 'stores/CollectionsStore';

import Layout from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import PreviewLoading from 'components/PreviewLoading';

type Props = {
  collections: CollectionsStore,
  match: Object,
};

type State = {
  redirectUrl: ?string,
};

@observer class Collection extends React.Component {
  props: Props;
  state: State;

  constructor(props) {
    super(props);
    this.state = {
      redirectUrl: null,
    };
  }

  componentDidMount = () => {
    const { id } = this.props.match.params;
    this.props.collections
      .getById(id)
      .then(collection => {
        if (collection.type !== 'atlas')
          throw new Error('TODO code up non-atlas collections');

        this.setState({
          redirectUrl: collection.navigationTree.url,
        });
      })
      .catch(() => {
        this.setState({
          redirectUrl: notFoundUrl(),
        });
      });
  };

  render() {
    return (
      <Layout>
        {this.state.redirectUrl && <Redirect to={this.state.redirectUrl} />}

        <CenteredContent>
          <PreviewLoading />
        </CenteredContent>
      </Layout>
    );
  }
}
export default inject('collections')(Collection);
