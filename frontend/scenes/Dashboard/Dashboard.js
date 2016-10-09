import React from 'react';
import { observer } from 'mobx-react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import store from './DashboardStore';

import { Flex } from 'reflexbox';
import Layout from 'components/Layout';
import AtlasPreview from 'components/AtlasPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

@observer(['user'])
class Dashboard extends React.Component {
  static propTypes = {
    user: React.PropTypes.object.isRequired,
  }

  componentDidMount = () => {
    store.fetchCollections(this.props.user.team.id);
  }

  render() {
    return (
      <Flex auto>
        <Layout>
          <CenteredContent>
            <Flex column auto>
              <ReactCSSTransitionGroup
                transitionName="fadeIn"
                transitionAppear
                transitionAppearTimeout={ 0 }
                transitionEnterTimeout={ 0 }
                transitionLeaveTimeout={ 0 }
              >
                { store.isFetching ? (
                  <AtlasPreviewLoading />
                ) : (
                  store.collections && store.collections.map((collection) => {
                    return (<AtlasPreview key={ collection.id } data={ collection } />);
                  })
                ) }
              </ReactCSSTransitionGroup>
            </Flex>
          </CenteredContent>
        </Layout>
      </Flex>
    );
  }
}

export default Dashboard;
