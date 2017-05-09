// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Editor, Plain } from 'slate';
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
};

type KeyData = {
  isMeta: boolean,
  key: string,
};

@observer
export default class SlateEditor extends Component {
  props: Props;
  editor: Object;

  state: {
    state: Object,
  };

  constructor(props: Props) {
    super(props);

    if (props.text) {
      this.state = { state: Markdown.deserialize(props.text) };
    } else {
      this.state = { state: Plain.deserialize('') };
    }
  }

  onChange = (state: Object) => {
    this.setState({ state });
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
          onKeyDown={this.onKeyDown}
          onSave={this.props.onSave}
        />
        <ClickablePadding onClick={this.focusAtEnd} grow />
      </span>
    );
  };
}
