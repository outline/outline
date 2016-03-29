import React from 'react';
import Codemirror from 'react-codemirror';
import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/continuelist';
import Dropzone from 'react-dropzone';

import styles from './MarkdownEditor.scss';
import './codemirror.css';

import { client } from '../../Utils/ApiClient';

class MarkdownAtlas extends React.Component {
  static propTypes = {
    text: React.PropTypes.string,
    onChange: React.PropTypes.func,
    replaceText: React.PropTypes.func,
  }

  getEditorInstance = () => {
    return this.refs.editor.getCodeMirror();
  }

  onChange = (newText) => {
    if (newText !== this.props.text) {
      this.props.onChange(newText);
    }
  }

  componentDidMount = () => {
    console.log(this.props);
  }

  onDropAccepted = (files) => {
    const file = files[0];
    const editor = this.getEditorInstance();

    const cursorPosition = editor.getCursor();
    const insertOnNewLine = cursorPosition.ch !== 0;
    let newCursorPositionLine;

    // Lets set up the upload text
    const pendingUploadTag = `![${file.name}](Uploading...)`;
    if (insertOnNewLine) {
      editor.replaceSelection('\n' + pendingUploadTag + '\n');
      newCursorPositionLine = cursorPosition.line + 3;
    } else {
      editor.replaceSelection(pendingUploadTag + '\n');
      newCursorPositionLine = cursorPosition.line + 2;
    }
    editor.setCursor(newCursorPositionLine, 0);

    client.post('/v0/user/s3', {
      kind: file.type,
      size: file.size,
      filename: file.name,
    })
    .then(data => {
      // Upload using FormData API
      let formData = new FormData();

      for (let key in data.form) {
        formData.append(key, data.form[key]);
      }

      if (file.blob) {
        formData.append('file', file.file);
      } else {
        formData.append('file', file);
      }

      fetch(data.upload_url, {
        method: 'post',
        body: formData
      })
      .then(s3Response => {
        this.props.replaceText(pendingUploadTag, `![${file.name}](${data.asset.url})`);
        editor.setCursor(newCursorPositionLine, 0);
      })
      .catch(err => {
        this.props.replaceText(pendingUploadTag, '');
        editor.setCursor(newCursorPositionLine, 0);
      });
    });
  }

  render = () => {
    // https://github.com/jbt/markdown-editor/blob/master/index.html
    const options = {
      readOnly: false,
      lineNumbers: false,
      mode: 'gfm',
      matchBrackets: true,
      lineWrapping: true,
      viewportMargin: Infinity,
      theme: 'atlas',
      extraKeys: {
        Enter: 'newlineAndIndentContinueMarkdownList',
      },
    };

    // http://codepen.io/lubelski/pen/fnGae
    // TODO:
    // - Emojify
    // -
    return (
      <div>
        <Dropzone
          onDropAccepted={this.onDropAccepted}
          disableClick={true}
          multiple={false}
          accept={'image/*'}
          className={styles.container}
        >
          <Codemirror
            value={this.props.text}
            onChange={this.onChange}
            options={options}
            ref="editor"
          />
        </Dropzone>
      </div>
    );
  }
}

export default MarkdownAtlas;
