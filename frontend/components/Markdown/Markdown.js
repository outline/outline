// @flow
import React from 'react';
import { State, Document, Editor } from 'slate';
import MarkdownSerializer from '../Editor/serializer';
import type { State as StateType } from '../Editor/types';
import schema from '../Editor/schema';
import styles from '../Editor/Editor.scss';

type Props = {
  text: string,
  className: string,
  limit: number,
};

function filterDocumentState({ state, characterLimit, nodeLimit }) {
  const { document } = state;
  if (document.text.length <= characterLimit) {
    return state;
  }

  let totalCharacters = 0;
  let totalNodes = 0;
  const nodes = document.nodes.filter(childNode => {
    if (childNode.text.length + totalCharacters <= characterLimit) {
      totalCharacters += childNode.text.length;

      if (totalNodes++ <= nodeLimit) {
        return true;
      }
    }
    return false;
  });

  return State.create({
    document: Document.create({
      ...document,
      nodes: nodes,
    }),
  });
}

class Markdown extends React.Component {
  props: Props;

  state: {
    state: StateType,
  };

  constructor(props: Props) {
    super(props);
    const state = MarkdownSerializer.deserialize(props.text);
    const options = {
      state,
      characterLimit: props.limit,
      nodeLimit: 5,
    };

    this.state = {
      state: filterDocumentState(options),
    };
  }

  render() {
    return (
      <span className={this.props.className}>
        <Editor
          className={styles.editor}
          schema={schema}
          state={this.state.state}
          readOnly
        />
      </span>
    );
  }
}

export default Markdown;
