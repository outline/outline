import React, { Component } from 'react';
import { connect } from 'react-redux';

import MarkdownEditor from '../../components/MarkdownEditor';

import {
  updateText,
  replaceText,
} from '../../actions';

import constants from '../../constants';

import styles from './Editor.scss';

class Editor extends Component {
  static propTypes = {
    editMarkdown: React.PropTypes.func.isRequired,
    text: React.PropTypes.string,
    replaceText: React.PropTypes.func.isRequired,
    showHistorySidebar: React.PropTypes.bool.isRequired,
  }

  render() {
    return (
      <div className={styles.container}>
        <div className={ styles.markdown }>
          <MarkdownEditor
            onChange={this.props.editMarkdown}
            text={this.props.text}
            replaceText={this.props.replaceText}
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    text: state.text.text,
    editor: state.editor,
    showHistorySidebar: state.historySidebar.visible,
    revisions: state.text.revisions,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    editMarkdown: (text) => {
      dispatch(updateText(text, 'markdown'));
    },
  };
};

Editor = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Editor);

export default Editor;
