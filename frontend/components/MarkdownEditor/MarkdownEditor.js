import React from 'react';
import { observer } from 'mobx-react';
import Codemirror from 'react-codemirror';
import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/display/placeholder.js';
import Dropzone from 'react-dropzone';

import ClickablePadding from './components/ClickablePadding';

import styles from './MarkdownEditor.scss';
import './codemirror.scss';

import { client } from 'utils/ApiClient';

@observer class MarkdownEditor extends React.Component {
  static propTypes = {
    text: React.PropTypes.string,
    onChange: React.PropTypes.func.isRequired,
    replaceText: React.PropTypes.func.isRequired,
    onSave: React.PropTypes.func.isRequired,
    onCancel: React.PropTypes.func.isRequired,

    // This is actually not used but it triggers
    // re-render to help with CodeMirror focus issues
    preview: React.PropTypes.bool,
    toggleUploadingIndicator: React.PropTypes.func,
  };

  onChange = newText => {
    if (newText !== this.props.text) {
      this.props.onChange(newText);
    }
  };

  onDropAccepted = files => {
    const file = files[0];
    const editor = this.getEditorInstance();

    const cursorPosition = editor.getCursor();
    const insertOnNewLine = cursorPosition.ch !== 0;
    let newCursorPositionLine;

    this.props.toggleUploadingIndicator();

    // Lets set up the upload text
    const pendingUploadTag = `![${file.name}](Uploading...)`;
    if (insertOnNewLine) {
      editor.replaceSelection(`\n${pendingUploadTag}\n`);
      newCursorPositionLine = cursorPosition.line + 3;
    } else {
      editor.replaceSelection(`${pendingUploadTag}\n`);
      newCursorPositionLine = cursorPosition.line + 2;
    }
    editor.setCursor(newCursorPositionLine, 0);

    client
      .post('/user.s3Upload', {
        kind: file.type,
        size: file.size,
        filename: file.name,
      })
      .then(response => {
        const data = response.data;
        // Upload using FormData API
        const formData = new FormData();

        for (const key in data.form) {
          formData.append(key, data.form[key]);
        }

        if (file.blob) {
          formData.append('file', file.file);
        } else {
          formData.append('file', file);
        }

        fetch(data.uploadUrl, {
          method: 'post',
          body: formData,
        })
          .then(_s3Response => {
            this.props.toggleUploadingIndicator();
            this.props.replaceText({
              original: pendingUploadTag,
              new: `![${file.name}](${data.asset.url})`,
            });
            editor.setCursor(newCursorPositionLine, 0);
          })
          .catch(_err => {
            this.props.toggleUploadingIndicator();
            this.props.replaceText({
              original: pendingUploadTag,
              new: '',
            });
            editor.setCursor(newCursorPositionLine, 0);
          });
      })
      .catch(_err => {
        this.props.toggleUploadingIndicator();
      });
  };

  onPaddingTopClick = () => {
    const cm = this.getEditorInstance();
    cm.setCursor(0, 0);
    cm.focus();
  };

  onPaddingBottomClick = () => {
    const cm = this.getEditorInstance();
    cm.setCursor(cm.lineCount(), 0);
    cm.focus();
  };

  getEditorInstance = () => {
    return this.refs.editor.getCodeMirror();
  };

  render = () => {
    const options = {
      readOnly: false,
      lineNumbers: false,
      mode: 'gfm',
      matchBrackets: true,
      lineWrapping: true,
      viewportMargin: Infinity,
      scrollbarStyle: 'null',
      theme: 'atlas',
      autofocus: true,
      extraKeys: {
        Enter: 'newlineAndIndentContinueMarkdownList',

        'Ctrl-Enter': this.props.onSave,
        'Cmd-Enter': this.props.onSave,

        'Cmd-Esc': this.props.onCancel,
        'Ctrl-Esc': this.props.onCancel,

        // 'Cmd-Shift-p': this.props.togglePreview,
        // 'Ctrl-Shift-p': this.props.togglePreview,
      },
      placeholder: '# Start with a title...',
    };

    return (
      <Dropzone
        onDropAccepted={this.onDropAccepted}
        disableClick
        multiple={false}
        accept="image/*"
        className={styles.container}
      >
        <ClickablePadding onClick={this.onPaddingTopClick} />
        <Codemirror
          value={this.props.text}
          onChange={this.onChange}
          options={options}
          ref="editor"
          className={styles.codeMirrorContainer}
        />
        <ClickablePadding onClick={this.onPaddingBottomClick} />
      </Dropzone>
    );
  };
}

export default MarkdownEditor;
