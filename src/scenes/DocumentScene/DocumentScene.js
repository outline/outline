import React from 'react';
import { connect } from 'react-redux';
import Link from 'react-router/lib/Link';
import { bindActionCreators } from 'redux';
import {
  fetchDocumentAsync,
  deleteDocument,
} from 'actions/DocumentActions';

import Layout, { HeaderAction } from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import Document from 'components/Document';
import DropdownMenu, { MenuItem } from 'components/DropdownMenu';

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

  onDelete = () => {
    if (confirm("Are you sure you want to delete this document?")) {
      this.props.deleteDocument(
        this.props.document.id,
        `/atlas/${ this.props.document.atlas.id }`,
      );
    };
  }

  render() {
    const document = this.props.document;
    let title;
    let actions;
    if (document) {
      actions = (
        <div className={ styles.actions }>
          <HeaderAction>
            <Link to={ `/documents/${document.id}/edit` }>Edit</Link>
          </HeaderAction>
          <DropdownMenu label="More">
            <MenuItem onClick={ this.onDelete }>Delete</MenuItem>
          </DropdownMenu>
        </div>
      );
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
    deleteDocument,
  }, dispatch)
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DocumentScene);
