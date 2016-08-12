import React from 'react';
import { observer } from 'mobx-react';

import store from './DashboardStore';

import { Flex } from 'reflexbox';
import Layout from 'components/Layout';
import AtlasPreview from 'components/AtlasPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';

// import styles from './Dashboard.scss';

@observer(['user'])
class Dashboard extends React.Component {
  static propTypes = {
    user: React.PropTypes.object.isRequired,
  }

  componentDidMount = () => {
    store.fetchCollections(this.props.user.team.id);
  }

  render() {
    const actions = (
      <Flex>
        <DropdownMenu label={ <MoreIcon /> } >
          <MenuItem onClick={ this.onClickNewAtlas }>
            Add collection
          </MenuItem>
        </DropdownMenu>
      </Flex>
    );

    return (
      <Flex auto>
        <Layout
          actions={ actions }
        >
          <CenteredContent>
            <Flex column auto>
              { store.isFetching ? (
                <AtlasPreviewLoading />
              ) : store.collections && store.collections.map((collection) => {
                return (<AtlasPreview key={ collection.id } data={ collection } />);
              }) }
            </Flex>
          </CenteredContent>
        </Layout>
      </Flex>
    );
  }
}

export default Dashboard;
