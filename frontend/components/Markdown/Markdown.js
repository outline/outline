// @flow
import React, { Component } from 'react';
import { Editor } from 'slate';
import MarkdownSerializer from '../Editor/serializer';
import type { State } from '../Editor/types';
import schema from '../Editor/schema';
import styles from '../Editor/Editor.scss';

type Props = {
  text: string,
};

export default class MarkdownEditor extends Component {
  props: Props;

  state: {
    state: State,
  };

  constructor(props: Props) {
    super(props);
    this.state = { state: MarkdownSerializer.deserialize(props.text) };
  }

  render = () => {
    return (
      <Editor
        className={styles.editor}
        schema={schema}
        state={this.state.state}
        readOnly
      />
    );
  };
}
