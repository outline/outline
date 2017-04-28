import React from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router';

import DashboardStore from './DashboardStore';

import { Flex } from 'reflexbox';
import Layout from 'components/Layout';
import AtlasPreview from 'components/AtlasPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

@withRouter
@inject('user')
@observer
class Dashboard extends React.Component {
  static propTypes = {
    user: React.PropTypes.object.isRequired,
    router: React.PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.store = new DashboardStore({
      team: props.user.team,
      router: props.router,
    });
  }

  render() {
    return (
      <Flex auto>
        <Layout>
          <CenteredContent>
            <Flex column auto>
              {this.store.isFetching
                ? <AtlasPreviewLoading />
                : this.store.collections &&
                    this.store.collections.map(collection => {
                      return (
                        <AtlasPreview key={collection.id} data={collection} />
                      );
                    })}
            </Flex>
          </CenteredContent>
        </Layout>
      </Flex>
    );
  }
}

export default Dashboard;
