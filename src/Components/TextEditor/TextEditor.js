import React from 'react';
import Editor from 'react-medium-editor';
import marked from 'marked';

require('medium-editor/dist/css/medium-editor.css');
require('medium-editor/dist/css/themes/default.css');
import styles from './TextEditor.scss';

class TextEditor extends React.Component {
  static propTypes = {
    text: React.PropTypes.string,
    onChange: React.PropTypes.func,
  }

  onChange = (newText) => {
    if (newText !== this.props.text) {
      this.props.onChange(newText);
    }
  }

  render = () => {
    return (
      <div className={ styles.container }>
        <div></div>
        <Editor
          options={{
            toolbar: {
              buttons: [
                'bold',
                'italic',
                'underline',
                'anchor',
                'unorderedlist',
                'orderedlist',
                'h1',
                'h2',
                'h3',
                'quote',
              ],
            },
            placeholder: false,
          }}
          text={marked(this.props.text)}
          onChange={ this.onChange }
          className={ styles.editor }
        />
      </div>
    );
  }
}

export default TextEditor;
