import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Editor, Plain } from 'slate';
import ClickablePadding from './components/ClickablePadding';
import Toolbar from './components/Toolbar';
import schema from './schema';
import Markdown from './serializer';
import plugins from './plugins';
import styles from './Editor.scss';

@observer
export default class SlateEditor extends Component {
  static propTypes = {
    text: React.PropTypes.string,
    onChange: React.PropTypes.func.isRequired,
    replaceText: React.PropTypes.func.isRequired,
    onSave: React.PropTypes.func.isRequired,
    onCancel: React.PropTypes.func.isRequired,
    toggleUploadingIndicator: React.PropTypes.func,
  };

  constructor(props) {
    super(props);

    if (props.text) {
      this.state = { state: Markdown.deserialize(props.text) };
    } else {
      this.state = { state: Plain.deserialize('') };
    }
  }

  onChange = state => {
    this.setState({ state });
  };

  onDocumentChange = (document, state) => {
    this.props.onChange(Markdown.serialize(state));
  };

  focusAtStart = () => {
    const state = this.editor.getState();
    const transform = state.transform();
    transform.collapseToStartOf(state.document);
    transform.focus();
    this.setState({ state: transform.apply() });
  };

  focusAtEnd = () => {
    const state = this.editor.getState();
    const transform = state.transform();
    transform.collapseToEndOf(state.document);
    transform.focus();
    this.setState({ state: transform.apply() });
  };

  render = () => {
    return (
      <span className={styles.container}>
        <ClickablePadding onClick={this.focusAtStart} />
        <Toolbar state={this.state.state} onChange={this.onChange} />
        <Editor
          ref={ref => (this.editor = ref)}
          placeholder="Start with a title…"
          className={styles.editor}
          schema={schema}
          plugins={plugins}
          state={this.state.state}
          onChange={this.onChange}
          onDocumentChange={this.onDocumentChange}
          onKeyDown={this.onKeyDown}
        />
        <ClickablePadding onClick={this.focusAtEnd} grow />
      </span>
    );
  };
}
