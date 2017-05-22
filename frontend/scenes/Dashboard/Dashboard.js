// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Flex } from 'reflexbox';
import { newCollectionUrl } from 'utils/routeHelpers';

import DashboardStore from './DashboardStore';
import UserStore from 'stores/UserStore';

import NudeButton from 'components/Button/Nude';
import AtlasPreview from 'components/AtlasPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import Layout, { HeaderAction } from 'components/Layout';

type Props = {
  history: Object,
  user: UserStore,
  router: Object,
};

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

  handleCreateCollection = (ev: SyntheticEvent) => {
    this.props.history.push(newCollectionUrl());
  };

  render() {
    const actions = (
      <HeaderAction>
        <NudeButton onClick={this.handleCreateCollection}>
          New Collection
        </NudeButton>
      </HeaderAction>
    );

    return (
      <Flex auto>
        <Layout actions={actions}>
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

export default withRouter(Dashboard);
