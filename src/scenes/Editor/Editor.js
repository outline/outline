import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  resetEditor,
  updateText,
  replaceText,
} from 'actions/EditorActions';
import {
  saveDocumentAsync,
} from 'actions/DocumentActions';

import Layout, { Title } from 'components/Layout';
import Flex from 'components/Flex';
import MarkdownEditor from 'components/MarkdownEditor';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

import SaveAction from './components/SaveAction';
import MoreAction from './components/MoreAction';

class Editor extends Component {
  static propTypes = {
    updateText: React.PropTypes.func.isRequired,
    replaceText: React.PropTypes.func.isRequired,
    saveDocumentAsync: React.PropTypes.func.isRequired,
    text: React.PropTypes.string,
    title: React.PropTypes.string,
  }

  componentDidMount = () => {
    const atlasId = this.props.routeParams.id;
    this.setState({
      atlasId: atlasId,
    });
  }

  onSave = () => {
    if (this.props.title.length === 0) {
      alert("Please add a title before saving (hint: Write a markdown header)");
      return
    }

    this.props.saveDocumentAsync(
      this.state.atlasId,
      null,
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
        <MarkdownEditor
          onChange={ this.props.updateText }
          text={ this.props.text }
          replaceText={this.props.replaceText}
        />
      </Layout>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    text: state.editor.text,
    title: state.editor.title,
    isSaving: state.document.isSaving,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    resetEditor,
    updateText,
    replaceText,
    saveDocumentAsync,
  }, dispatch)
};

Editor = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Editor);

export default Editor;
