// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Flex } from 'reflexbox';

import DashboardStore from './DashboardStore';

import Layout from 'components/Layout';
import Collection from 'components/Collection';
import PreviewLoading from 'components/PreviewLoading';
import CenteredContent from 'components/CenteredContent';

type Props = {
  user: Object,
  router: Object,
};

@withRouter
@inject('user')
@observer
class Dashboard extends React.Component {
  props: Props;
  store: DashboardStore;

  constructor(props: Props) {
    super(props);

    this.store = new DashboardStore({
      team: props.user.team,
      router: props.router,
    });
  }

  render() {
    return (
      <Layout>
        <CenteredContent>
          <Flex column auto>
            {this.store.isFetching
              ? <PreviewLoading />
              : this.store.collections &&
                  this.store.collections.map(collection => (
                    <Collection key={collection.id} data={collection} />
                  ))}
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

export default Dashboard;
