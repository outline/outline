// @flow
import * as React from 'react';
import styled from 'styled-components';
import { Text } from 'slate';
import RichMarkdownEditor, { Placeholder } from 'rich-markdown-editor';
import ClickablePadding from 'components/ClickablePadding';
import { uploadFile } from 'utils/uploadFile';
import isInternalUrl from 'utils/isInternalUrl';

type Props = {
  titlePlaceholder?: string,
  bodyPlaceholder?: string,
  defaultValue?: string,
  readOnly?: boolean,
  expandToFit?: boolean,
  history: *,
  ui: *,
};

class Editor extends React.Component<Props> {
  editor: *;

  componentDidMount() {
    if (!this.props.defaultValue) {
      this.focusAtStart();
    }
  }

  setEditorRef = (ref: RichMarkdownEditor) => {
    this.editor = ref;
  };

  focusAtStart = () => {
    if (this.editor) this.editor.focusAtStart();
  };

  focusAtEnd = () => {
    if (this.editor) this.editor.focusAtEnd();
  };

  onUploadImage = async (file: File) => {
    const result = await uploadFile(file);
    return result.url;
  };

  onClickLink = (href: string) => {
    // on page hash
    if (href[0] === '#') {
      window.location.href = href;
      return;
    }

    if (isInternalUrl(href)) {
      // relative
      let navigateTo = href;

      // probably absolute
      if (href[0] !== '/') {
        try {
          const url = new URL(href);
          navigateTo = url.pathname + url.hash;
        } catch (err) {
          navigateTo = href;
        }
      }

      this.props.history.push(navigateTo);
    } else {
      window.open(href, '_blank');
    }
  };

  onShowToast = (message: string) => {
    this.props.ui.showToast(message, 'success');
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
    const { readOnly, expandToFit } = this.props;

    return (
      <React.Fragment>
        <StyledEditor
          ref={this.setEditorRef}
          renderPlaceholder={this.renderPlaceholder}
          uploadImage={this.onUploadImage}
          onClickLink={this.onClickLink}
          onShowToast={this.onShowToast}
          {...this.props}
        />
        {expandToFit && (
          <ClickablePadding
            onClick={!readOnly ? this.focusAtEnd : undefined}
            grow
          />
        )}
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
