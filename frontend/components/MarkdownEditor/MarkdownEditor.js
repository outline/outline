// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Editor, Plain } from 'slate';
import type { Document, State, Editor as EditorType } from './types';
import ClickablePadding from './components/ClickablePadding';
import Toolbar from './components/Toolbar';
import schema from './schema';
import Markdown from './serializer';
import plugins from './plugins';
import styles from './Editor.scss';

type Props = {
  text: string,
  onChange: Function,
  onSave: Function,
  onCancel: Function,
  readOnly: boolean,
};

type KeyData = {
  isMeta: boolean,
  key: string,
};

@observer
export default class MarkdownEditor extends Component {
  props: Props;
  editor: EditorType;

  state: {
    state: State,
  };

  constructor(props: Props) {
    super(props);

    if (props.text) {
      this.state = { state: Markdown.deserialize(props.text) };
    } else {
      this.state = { state: Plain.deserialize('') };
    }
  }

  onChange = (state: State) => {
    this.setState({ state });
  };

  onDocumentChange = (document: Document, state: State) => {
    this.props.onChange(Markdown.serialize(state));
  };

  onKeyDown = (ev: SyntheticKeyboardEvent, data: KeyData) => {
    if (!data.isMeta) return;

    switch (data.key) {
      case 's':
        ev.preventDefault();
        return this.props.onSave({ redirect: false });
      case 'enter':
        return this.props.onSave();
      case 'escape':
        return this.props.onCancel();
      default:
    }
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
          onSave={this.props.onSave}
          readOnly={this.props.readOnly}
        />
        <ClickablePadding onClick={this.focusAtEnd} grow />
      </span>
    );
  };
}
