import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  resetEditor,
  updateText,
  updateTitle,
  replaceText,
} from 'actions/EditorActions';
import {
  resetDocument,
  fetchDocumentAsync,
  saveDocumentAsync,
} from 'actions/DocumentActions';

import Layout, { Title } from 'components/Layout';
import Flex from 'components/Flex';
import MarkdownEditor from 'components/MarkdownEditor';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

import SaveAction from './components/SaveAction';

class DocumentEdit extends Component {
  static propTypes = {
    updateText: React.PropTypes.func.isRequired,
    updateTitle: React.PropTypes.func.isRequired,
    replaceText: React.PropTypes.func.isRequired,
    resetDocument: React.PropTypes.func.isRequired,
    saveDocumentAsync: React.PropTypes.func.isRequired,
    text: React.PropTypes.string,
    title: React.PropTypes.string,
    isSaving: React.PropTypes.bool,
  }

  state = {
    loadingDocument: false,
  }

  componentWillMount = () => {
    this.props.resetEditor();
    this.props.resetDocument();
  }

  componentDidMount = () => {
    const id = this.props.routeParams.id;
    this.props.fetchDocumentAsync(id);
  }

  componentWillReceiveProps = (nextProps) => {
    if (!this.props.document && nextProps.document) {
      const doc = nextProps.document;
      this.props.updateText(doc.text);
      this.props.updateTitle(doc.title);
    }
  }

  onSave = () => {
    if (this.props.title.length === 0) {
      alert("Please add a title before saving (hint: Write a markdown header)");
      return
    }

    this.props.saveDocumentAsync(
      null,
      this.props.document.id,
      this.props.title,
      this.props.text,
    )
  }

  render() {
    let title = (
      <Title
        truncate={ 60 }
        placeholder={ "Untitle document" }
      >
        { this.props.title }
      </Title>
    );

    return (
      <Layout
        actions={(
          <Flex direction="row" align="center">
            <SaveAction onClick={ this.onSave } />
          </Flex>
        )}
        title={ title }
        fixed={ true }
        loading={ this.props.isSaving }
      >
        { (this.props.isLoading && !this.props.document) ? (
          <CenteredContent>
            <AtlasPreviewLoading />
          </CenteredContent>
        ) : (
          <MarkdownEditor
            onChange={ this.props.updateText }
            text={ this.props.text }
            replaceText={this.props.replaceText}
          />
        ) }
      </Layout>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    document: state.document.data,
    text: state.editor.text,
    title: state.editor.title,
    isLoading: state.document.isLoading,
    isSaving: state.document.isSaving,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    resetEditor,
    updateText,
    updateTitle,
    replaceText,
    resetDocument,
    fetchDocumentAsync,
    saveDocumentAsync,
  }, dispatch)
};

DocumentEdit = connect(
  mapStateToProps,
  mapDispatchToProps,
)(DocumentEdit);

export default DocumentEdit;
