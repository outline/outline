// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Flex } from 'reflexbox';

import Layout from 'components/Layout';
import AtlasPreview from 'components/AtlasPreview';
import ContentLoading from 'components/ContentLoading';
import CenteredContent from 'components/CenteredContent';
import DashboardStore from 'stores/DashboardStore';

type Props = {
  dashboard: DashboardStore,
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
      <Flex column>
        <Flex column>
          {collections &&
            collections.map(collection => (
              <AtlasPreview key={collection.id} data={collection} />
            ))}
        </Flex>
      </Flex>
    );
  }

  render() {
    const { isLoaded } = this.props.dashboard;

    return (
      <Layout>
        <CenteredContent>
          <Flex column auto>
            {!isLoaded ? <ContentLoading /> : this.renderCollections()}
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

export default inject('dashboard')(Dashboard);
