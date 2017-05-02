// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Flex } from 'reflexbox';

import Layout from 'components/Layout';
import AtlasPreview from 'components/AtlasPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DashboardStore from 'stores/DashboardStore';

type Props = {
  user: UserStore,
};

@observer class Dashboard extends React.Component {
  props: Props;
  store: DashboardStore;

  componentDidMount() {
    this.props.dashboard.fetchCollections();
  }

  renderCollections() {
    const { collections } = this.props.dashboard;
    return (
      collections &&
      collections.map(collection => (
        <AtlasPreview key={collection.id} data={collection} />
      ))
    );
  }

  render() {
    const { isLoaded } = this.props.dashboard;

    return (
      <Layout>
        <CenteredContent>
          <Flex column auto>
            {!isLoaded ? <AtlasPreviewLoading /> : this.renderCollections()}
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

export { Dashboard };
export default inject('user', 'dashboard')(Dashboard);
