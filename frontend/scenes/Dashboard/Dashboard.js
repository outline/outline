// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Flex } from 'reflexbox';
import styled from 'styled-components';

import Heading from 'components/Heading';
import Layout from 'components/Layout';
import AtlasPreview from 'components/AtlasPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DashboardStore from 'stores/DashboardStore';
import { fontSize, color } from 'styles/constants';

import UserStore from 'stores/UserStore';

type Props = {
  user: UserStore,
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
            {!isLoaded ? <AtlasPreviewLoading /> : this.renderCollections()}
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

export { Dashboard };
export default inject('user', 'dashboard')(Dashboard);
