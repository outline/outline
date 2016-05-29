import React from 'react';
import { connect } from 'react-redux';
import Link from 'react-router/lib/Link';
import { bindActionCreators } from 'redux';
import { fetchDocumentAsync } from 'actions/DocumentActions';

import Layout from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import Document from 'components/Document';

import styles from './DocumentScene.scss';

class DocumentScene extends React.Component {
  state = {
    didScroll: false,
  }

  componentDidMount = () => {
    const documentId = this.props.routeParams.id;
    this.props.fetchDocumentAsync(documentId);
  }

  componentWillReceiveProps = (nextProps) => {
    // Scroll to anchor after loading, and only once
    const hash = this.props.location.hash;

    if (nextProps.document && hash && !this.state.didScroll) {
      const name = hash.split('#')[1];
      setTimeout(() => {
        this.setState({ didScroll: true });
        const element = document.getElementsByName(name)[0];
        if (element) element.scrollIntoView()
      }, 0);
    }
  }

  render() {
    const document = this.props.document;
    let title;
    let actions;
    if (document) {
      actions = <Link to={ `/documents/${document.id}/edit` }>Edit</Link>;
      title = `${document.atlas.name} - ${document.title}`;
    }

    return (
      <Layout
        title={ title }
        actions={ actions }
      >
        <CenteredContent>
          { this.props.isLoading || !document ? (
            <AtlasPreviewLoading />
          ) : (
            <Document document={ document } />
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
)(DocumentScene);
