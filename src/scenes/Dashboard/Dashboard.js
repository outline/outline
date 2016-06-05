import React from 'react';
import { observer } from 'mobx-react';

import userStore from 'stores/UserStore';
import store from './DashboardStore';

import Flex from 'components/Flex';
import Layout from 'components/Layout';
import AtlasPreview from 'components/AtlasPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

import styles from './Dashboard.scss';

@observer
class Dashboard extends React.Component {
  componentDidMount = () => {
    store.fetchAtlases(userStore.team.id);
  }

  render() {
    return (
      <Layout>
        <CenteredContent>
          <Flex direction="column" flex={ true }>
            { store.isFetching ? (
              <AtlasPreviewLoading />
            ) : store.atlases.map((atlas) => {
             return  (<AtlasPreview key={ atlas.id } data={ atlas } />);
            }) }
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

export default Dashboard;
