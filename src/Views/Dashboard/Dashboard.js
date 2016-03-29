import React, { Component } from 'react';
import { connect } from 'react-redux';

import MarkdownEditor from '../../Components/MarkdownEditor';
import TextEditor from '../../Components/TextEditor';

import { toMarkdown } from '../../Utils/Markdown';
import {
  updateText,
  replaceText,
} from '../../Actions';

import Constants from '../../Constants';

import styles from './Dashboard.scss';

class Dashboard extends Component {
  static propTypes = {
    editMarkdown: React.PropTypes.func.isRequired,
    editText: React.PropTypes.func.isRequired,
    text: React.PropTypes.string,
    replaceText: React.PropTypes.func.isRequired,
    activeEditors: React.PropTypes.arrayOf(React.PropTypes.string),
    showHistorySidebar: React.PropTypes.bool.isRequired,
  }

  render() {
    const activeEditors = this.props.activeEditors;

    return (
      <div className={styles.container}>
        {
          activeEditors.includes('MARKDOWN') ? (
            <div className={ `${activeEditors.length > 1 ?
                styles.panel : styles.fullscreen} ${styles.markdown}`}
            >
              <MarkdownEditor
                onChange={this.props.editMarkdown}
                text={this.props.text}
                replaceText={this.props.replaceText}
              />
            </div>
          ) : null
        }
        {
          activeEditors.includes('TEXT') ? (
            <div className={ `${activeEditors.length > 1 ?
                styles.panel : styles.fullscreen} ${styles.text}`}
            >
              <TextEditor onChange={this.props.editText} text={this.props.text} />
            </div>
          ) : null
        }
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    text: state.text.text,
    editor: state.editor,
    activeEditors: state.activeEditors,
    showHistorySidebar: state.historySidebar.visible,
    revisions: state.text.revisions,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    editMarkdown: (text) => {
      dispatch(updateText(text, 'markdown'));
    },
    editText: (html) => {
      const text = toMarkdown(html);
      dispatch(updateText(text, 'text'));
    },
    replaceText: (originalText, replacedText) => {
      dispatch(replaceText(originalText, replacedText));
    },
  };
};

Dashboard = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Dashboard);

export default Dashboard;
