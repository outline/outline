import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { replace } from 'react-router-redux';
import { fetchAtlasAsync } from 'actions/AtlasActions';

// Temp
import { client } from 'utils/ApiClient';

import Layout from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

import styles from './Atlas.scss';

class Atlas extends React.Component {
  static propTypes = {
    atlas: React.PropTypes.object,
  }

  state = {
    isLoading: true,
    data: null,
  }

  componentDidMount = () => {
    const { id } = this.props.params;

    // this.props.fetchAtlasAsync(id);

    // Temp before breaking out redux store
    client.post('/atlases.info', {
      id: id,
    })
    .then(data => {
      this.setState({
        isLoading: false,
        data: data.data
      });
    })
  }

  render() {
    const data = this.state.data;

    return (
      <Layout>
        <CenteredContent>
          { this.state.isLoading ? (
            <AtlasPreviewLoading />
          ) : (
            <div className={ styles.container }>
              <div className={ styles.atlasDetails }>
                <h2>{ data.name }</h2>
                <blockquote>
                  { data.description }
                </blockquote>
              </div>

              <div className={ styles.divider }><span></span></div>
            </div>
          ) }
        </CenteredContent>
      </Layout>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    isLoading: state.atlases.isLoading,
  }
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    replace,
    fetchAtlasAsync,
  }, dispatch)
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Atlas);
