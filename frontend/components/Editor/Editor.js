import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Dropzone from 'react-dropzone';
import MarkdownEditor from './components/MarkdownEditor';
import ClickablePadding from './components/ClickablePadding';
import styles from './Editor.scss';
import { client } from 'utils/ApiClient';

@observer
class Editor extends Component {
  static propTypes = {
    text: React.PropTypes.string,
    onChange: React.PropTypes.func.isRequired,
    replaceText: React.PropTypes.func.isRequired,
    onSave: React.PropTypes.func.isRequired,
    onCancel: React.PropTypes.func.isRequired,
    toggleUploadingIndicator: React.PropTypes.func,
  }

  onDocumentChange = (text) => {
    this.props.onChange(text);
  }

  onDropAccepted = async (files) => {
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

    try {
      const response = await client.post('/user.s3Upload', {
        kind: file.type,
        size: file.size,
        filename: file.name,
      })

      const data = response.data;
      const formData = new FormData();

      for (const key in data.form) {
        formData.append(key, data.form[key]);
      }

      formData.append('file', file.blob ? file.file : file);

      try {
        await fetch(data.uploadUrl, {
          method: 'post',
          body: formData,
        });

        this.props.toggleUploadingIndicator();
        this.props.replaceText({
          original: pendingUploadTag,
          new: `![${file.name}](${data.asset.url})`,
        });
        editor.setCursor(newCursorPositionLine, 0);

      } catch (err) {
        this.props.toggleUploadingIndicator();
        this.props.replaceText({
          original: pendingUploadTag,
          new: '',
        });
        editor.setCursor(newCursorPositionLine, 0);
      }
    } catch (err) {
      this.props.toggleUploadingIndicator();
    }
  }

  onPaddingTopClick = () => {
    const cm = this.getEditorInstance();
    cm.setCursor(0, 0);
    cm.focus();
  }

  onPaddingBottomClick = () => {
    const cm = this.getEditorInstance();
    cm.setCursor(cm.lineCount(), 0);
    cm.focus();
  }

  getEditorInstance = () => {

  }

  render = () => {
    return (
      <Dropzone
        onDropAccepted={ this.onDropAccepted }
        disableClick
        multiple={ false }
        accept="image/*"
        className={ styles.container }
      >
        <ClickablePadding onClick={ this.onPaddingTopClick } />
        <MarkdownEditor
          ref={ ref => this.editor = ref }
          placeholder="# Start with a title…"
          text={ this.props.text }
          onDocumentChange={ this.onDocumentChange }
        />
        <ClickablePadding onClick={ this.onPaddingBottomClick } />
      </Dropzone>
    );
  }
}

export default Editor;
