// @flow
import * as React from 'react';
import styled from 'styled-components';
import { Text } from 'slate';
import { Placeholder } from 'rich-markdown-editor';
import Editor from 'components/Editor';
import ClickablePadding from 'components/ClickablePadding';

type Props = {
  titlePlaceholder?: string,
  bodyPlaceholder?: string,
  defaultValue?: string,
  readOnly?: boolean,
};

class DocumentEditor extends React.Component<Props> {
  editor: *;

  componentDidMount() {
    if (!this.props.defaultValue) {
      this.focusAtStart();
    }
  }

  focusAtStart = () => {
    if (this.editor) this.editor.focusAtStart();
  };

  focusAtEnd = () => {
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
          ref={ref => (this.editor = ref)}
          renderPlaceholder={this.renderPlaceholder}
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
const StyledEditor = styled(Editor)`
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

export default DocumentEditor;
