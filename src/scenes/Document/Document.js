import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { fetchDocumentAsync } from 'actions/DocumentActions';

import Layout from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

import styles from './Document.scss';

class Document extends React.Component {
  componentDidMount = () => {
    const documentId = this.props.routeParams.id;
    this.props.fetchDocumentAsync(documentId);
  }

  render() {
    const document = this.props.document;
    let title;
    if (document) {
      title = `${document.atlas.name} - ${document.title}`;
    }

    return (
      <Layout
        title={ title }
      >
        <CenteredContent>
          { this.props.isLoading || !document ? (
            <AtlasPreviewLoading />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: document.html }} />
          ) }
        </CenteredContent>
      </Layout>
    );
  }
};


const mapStateToProps = (state) => {
  return {
    isLoading: state.document.isLoading,
    document: state.document.data,
  }
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    fetchDocumentAsync,
  }, dispatch)
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Document);
