import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { fetchAtlasesAsync } from 'actions/AtlasActions';

import Flex from 'components/Flex';
import Layout from 'components/Layout';
import AtlasPreview from 'components/AtlasPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

import styles from './Dashboard.scss';

class Dashboard extends React.Component {
  static propTypes = {
  }

  componentDidMount = () => {
    this.props.fetchAtlasesAsync(this.props.teamId);
  }

  render() {
    return (
      <Layout>
        <CenteredContent>
          <Flex direction="column" flex={ true }>
            { this.props.isLoading ? (
              <AtlasPreviewLoading />
            ) : this.props.items.map((item) => {
             return  (<AtlasPreview key={ item.id } data={ item } />);
            }) }
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    teamId: state.team ? state.team.id : null,
    isLoading: state.atlases.isLoading,
    items: Array.isArray(state.atlases.result) ? state.atlases.result.map((id) => state.atlases.entities.atlases[id]) : [], // reselect
  }
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    fetchAtlasesAsync,
  }, dispatch)
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Dashboard);
