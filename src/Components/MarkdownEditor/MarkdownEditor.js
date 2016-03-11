import React from 'react';
import Codemirror from 'react-codemirror';
import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/continuelist';

import styles from './MarkdownEditor.scss';
import './codemirror.css';

class MarkdownAtlas extends React.Component {
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
      <div className={ styles.container }>
        <Codemirror
          value={this.props.text}
          onChange={this.onChange}
          options={options}
        />
      </div>
    );
  }
}

export default MarkdownAtlas;
