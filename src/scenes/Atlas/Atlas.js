import React from 'react';
import Link from 'react-router/lib/Link';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { replace } from 'react-router-redux';
import { fetchAtlasAsync } from 'actions/AtlasActions';

// Temp
import { client } from 'utils/ApiClient';

import Layout, { Title } from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DocumentList from 'components/DocumentList';
import Divider from 'components/Divider';

import styles from './Atlas.scss';

class Atlas extends React.Component {
  static propTypes = {
    isLoading: React.PropTypes.bool,
    atlas: React.PropTypes.object,
  }

  componentDidMount = () => {
    const { id } = this.props.params;

    this.props.fetchAtlasAsync(id);
  }

  render() {
    const atlas = this.props.atlas;

    let actions;
    let title;

    if (this.props.isLoading === false) {
      actions = <Link to={ `/atlas/${atlas.id}/new` }>New document</Link>;
      title = <Title>{ atlas.name }</Title>;
    }

    return (
      <Layout
        actions={ actions }
        title={ title }
      >
        <CenteredContent>
          { this.props.isLoading ? (
            <AtlasPreviewLoading />
          ) : (
            <div className={ styles.container }>
              <div className={ styles.atlasDetails }>
                <h2>{ atlas.name }</h2>
                <blockquote>
                  { atlas.description }
                </blockquote>
              </div>

              <Divider />

              <DocumentList documents={ atlas.recentDocuments } preview={ true } />
            </div>
          ) }
        </CenteredContent>
      </Layout>
    );
  }
}

const mapStateToProps = (state, currentProps) => {
  const id = currentProps.params.id;

  return {
    isLoading: state.atlases.isLoading,
    atlas: state.atlases.entities ? state.atlases.entities.atlases[id] : null, // reselect
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
