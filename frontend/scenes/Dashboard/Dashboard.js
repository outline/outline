import React from 'react';
import { observer } from 'mobx-react';

import store from './DashboardStore';

import Flex from 'components/Flex';
import Layout from 'components/Layout';
import AtlasPreview from 'components/AtlasPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';
import FullscreenField from 'components/FullscreenField';

// import styles from './Dashboard.scss';

@observer(['user'])
class Dashboard extends React.Component {
  static propTypes = {
    user: React.PropTypes.object.isRequired,
  }

  state = {
    newAtlasVisible: false,
  }

  componentDidMount = () => {
    store.fetchCollections(this.props.user.team.id);
  }

  onClickNewAtlas = () => {
    this.setState({
      newAtlasVisible: true,
    });
  }

  render() {
    const actions = (
      <Flex direction="row">
        <DropdownMenu label={ <MoreIcon /> } >
          <MenuItem onClick={ this.onClickNewAtlas }>
            New Atlas
          </MenuItem>
        </DropdownMenu>
      </Flex>
    );

    return (
      <Flex flex>
        <Layout
          actions={ actions }
        >
          <CenteredContent>
            <Flex direction="column" flex>
              { store.isFetching ? (
                <AtlasPreviewLoading />
              ) : store.collections && store.collections.map((collection) => {
                return (<AtlasPreview key={ collection.id } data={ collection } />);
              }) }
            </Flex>
          </CenteredContent>
        </Layout>

        { this.state.newAtlasVisible && <FullscreenField /> }
      </Flex>
    );
  }
}

export default Dashboard;
