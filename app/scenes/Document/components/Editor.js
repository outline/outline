// @flow
import * as React from 'react';
import styled from 'styled-components';
import { Block, Change, Node, Mark, Text } from 'slate';
import RichMarkdownEditor, { Placeholder, schema } from 'rich-markdown-editor';
import ClickablePadding from 'components/ClickablePadding';

type Props = {
  titlePlaceholder: string,
  bodyPlaceholder: string,
  readOnly: boolean,
};

// add rules to the schema to ensure the first node is a heading
schema.document.nodes.unshift({ types: ['heading1'], min: 1, max: 1 });
schema.document.normalize = (
  change: Change,
  reason: string,
  {
    node,
    child,
    mark,
    index,
  }: { node: Node, mark?: Mark, child: Node, index: number }
) => {
  switch (reason) {
    case 'child_type_invalid': {
      return change.setNodeByKey(
        child.key,
        index === 0 ? 'heading1' : 'paragraph'
      );
    }
    case 'child_required': {
      const block = Block.create(index === 0 ? 'heading1' : 'paragraph');
      return change.insertNodeByKey(node.key, index, block);
    }
    default:
  }
};

class Editor extends React.Component<Props> {
  editor: *;

  setEditorRef = (ref: RichMarkdownEditor) => {
    this.editor = ref;
  };

  focusAtEnd = () => {
    console.log(this.editor);
    if (this.editor) this.editor.focusAtEnd();
  };

  renderPlaceholder = (props: *) => {
    const { editor, node } = props;

    if (editor.state.isComposing) return;
    if (node.object !== 'block') return;
    if (!Text.isTextList(node.nodes)) return;
    if (node.text !== '') return;

    const index = editor.value.document.getBlocks().indexOf(node);
    if (index > 1) return;

    const text =
      index === 0 ? this.props.titlePlaceholder : this.props.bodyPlaceholder;

    return <Placeholder>{editor.props.readOnly ? '' : text}</Placeholder>;
  };

  render() {
    const { readOnly } = this.props;

    return (
      <React.Fragment>
        <StyledEditor
          innerRef={this.setEditorRef}
          renderPlaceholder={this.renderPlaceholder}
          schema={schema}
          {...this.props}
        />
        <ClickablePadding
          onClick={!readOnly ? this.focusAtEnd : undefined}
          grow
        />
      </React.Fragment>
    );
  }
}

// additional styles account for placeholder nodes not always re-rendering
const StyledEditor = styled(RichMarkdownEditor)`
  display: flex;
  flex: 0;

  ${Placeholder} {
    visibility: hidden;
  }

  h1:first-of-type {
    ${Placeholder} {
      visibility: visible;
    }
  }

  p:nth-child(2):last-child {
    ${Placeholder} {
      visibility: visible;
    }
  }
`;

export default Editor;
