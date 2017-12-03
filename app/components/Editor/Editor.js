// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { Editor } from 'slate-react';
import type { state, props, change } from 'slate-prop-types';
import Plain from 'slate-plain-serializer';
import keydown from 'react-keydown';
import getDataTransferFiles from 'utils/getDataTransferFiles';
import Flex from 'shared/components/Flex';
import ClickablePadding from './components/ClickablePadding';
import Toolbar from './components/Toolbar';
import BlockInsert from './components/BlockInsert';
import Placeholder from './components/Placeholder';
import Contents from './components/Contents';
import Markdown from './serializer';
import createPlugins from './plugins';
import insertImage from './insertImage';
import renderMark from './marks';
import createRenderNode from './nodes';
import styled from 'styled-components';

type Props = {
  text: string,
  onChange: change => *,
  onSave: (redirect?: boolean) => *,
  onCancel: () => void,
  onImageUploadStart: () => void,
  onImageUploadStop: () => void,
  emoji?: string,
  readOnly: boolean,
};

type KeyData = {
  isMeta: boolean,
  key: string,
};

@observer
class MarkdownEditor extends Component {
  props: Props;
  editor: Editor;
  renderNode: props => *;
  plugins: Object[];
  @observable editorValue: state;

  constructor(props: Props) {
    super(props);

    this.renderNode = createRenderNode({
      onInsertImage: this.insertImageFile,
      onChange: this.onChange,
    });
    this.plugins = createPlugins({
      onImageUploadStart: props.onImageUploadStart,
      onImageUploadStop: props.onImageUploadStop,
    });

    if (props.text.trim().length) {
      this.editorValue = Markdown.deserialize(props.text);
    } else {
      this.editorValue = Plain.deserialize('');
    }
  }

  componentDidMount() {
    if (!this.props.readOnly) {
      if (this.props.text) {
        this.focusAtEnd();
      } else {
        this.focusAtStart();
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.readOnly && !this.props.readOnly) {
      this.focusAtEnd();
    }
  }

  onChange = (change: change) => {
    if (this.editorValue !== change.value) {
      this.props.onChange(Markdown.serialize(change.value));
    }
    this.editorValue = change.value;
  };

  handleDrop = async (ev: SyntheticEvent) => {
    if (this.props.readOnly) return;
    // check if this event was already handled by the Editor
    if (ev.isDefaultPrevented()) return;

    // otherwise we'll handle this
    ev.preventDefault();
    ev.stopPropagation();

    const files = getDataTransferFiles(ev);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await this.insertImageFile(file);
      }
    }
  };

  insertImageFile = async (file: window.File) => {
    this.editor.change(
      async change =>
        await insertImage(
          change,
          file,
          this.editor,
          this.props.onImageUploadStart,
          this.props.onImageUploadStop
        )
    );
  };

  cancelEvent = (ev: SyntheticEvent) => {
    ev.preventDefault();
  };

  // Handling of keyboard shortcuts outside of editor focus
  @keydown('meta+s')
  onSave(ev: SyntheticKeyboardEvent) {
    if (this.props.readOnly) return;

    ev.preventDefault();
    ev.stopPropagation();
    this.props.onSave();
  }

  @keydown('meta+enter')
  onSaveAndExit(ev: SyntheticKeyboardEvent) {
    if (this.props.readOnly) return;

    ev.preventDefault();
    ev.stopPropagation();
    this.props.onSave(true);
  }

  @keydown('esc')
  onCancel() {
    if (this.props.readOnly) return;
    this.props.onCancel();
  }

  // Handling of keyboard shortcuts within editor focus
  onKeyDown = (ev: SyntheticKeyboardEvent, data: KeyData, change: change) => {
    if (!data.isMeta) return;

    switch (data.key) {
      case 's':
        this.onSave(ev);
        return change;
      case 'enter':
        this.onSaveAndExit(ev);
        return change;
      case 'escape':
        this.onCancel();
        return change;
      default:
    }
  };

  focusAtStart = () => {
    this.editor.change(change =>
      change.collapseToStartOf(change.value.document).focus()
    );
  };

  focusAtEnd = () => {
    this.editor.change(change =>
      change.collapseToEndOf(change.value.document).focus()
    );
  };

  render = () => {
    const { readOnly, emoji, onSave } = this.props;

    return (
      <Flex
        onDrop={this.handleDrop}
        onDragOver={this.cancelEvent}
        onDragEnter={this.cancelEvent}
        align="flex-start"
        justify="center"
        auto
      >
        <MaxWidth column auto>
          <Header onClick={this.focusAtStart} readOnly={readOnly} />
          {readOnly && this.editor && <Contents editor={this.editor} />}
          {!readOnly &&
            this.editor && (
              <Toolbar value={this.editorValue} editor={this.editor} />
            )}
          {!readOnly &&
            this.editor && (
              <BlockInsert
                editor={this.editor}
                onInsertImage={this.insertImageFile}
              />
            )}
          <StyledEditor
            innerRef={ref => (this.editor = ref)}
            placeholder="Start with a title…"
            bodyPlaceholder="…the rest is your canvas"
            plugins={this.plugins}
            emoji={emoji}
            value={this.editorValue}
            renderNode={this.renderNode}
            renderMark={renderMark}
            onKeyDown={this.onKeyDown}
            onChange={this.onChange}
            onSave={onSave}
            readOnly={readOnly}
          />
          <ClickablePadding
            onClick={!readOnly ? this.focusAtEnd : undefined}
            grow
          />
        </MaxWidth>
      </Flex>
    );
  };
}

const MaxWidth = styled(Flex)`
  margin: 0 60px;
  max-width: 46em;
  height: 100%;
`;

const Header = styled(Flex)`
  height: 60px;
  flex-shrink: 0;
  align-items: flex-end;
  ${({ readOnly }) => !readOnly && 'cursor: text;'};
`;

const StyledEditor = styled(Editor)`
  font-weight: 400;
  font-size: 1em;
  line-height: 1.7em;
  width: 100%;
  color: #1b2830;

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 500;
  }

  h1:first-of-type {
    ${Placeholder} {
      visibility: visible;
    }
  }

  p:nth-child(2) {
    ${Placeholder} {
      visibility: visible;
    }
  }

  ul,
  ol {
    margin: 1em 0.1em;
    padding-left: 1em;

    ul,
    ol {
      margin: 0.1em;
    }
  }

  p {
    position: relative;
    margin-top: 1.2em;
    margin-bottom: 1.2em;
  }

  a:hover {
    text-decoration: ${({ readOnly }) => (readOnly ? 'underline' : 'none')};
  }

  li p {
    display: inline;
    margin: 0;
  }

  .todoList {
    list-style: none;
    padding-left: 0;

    .todoList {
      padding-left: 1em;
    }
  }

  .todo {
    span:last-child:focus {
      outline: none;
    }
  }

  blockquote {
    border-left: 3px solid #efefef;
    padding-left: 10px;
  }

  table {
    border-collapse: collapse;
  }

  tr {
    border-bottom: 1px solid #eee;
  }

  th {
    font-weight: bold;
  }

  th,
  td {
    padding: 5px 20px 5px 0;
  }

  b,
  strong {
    font-weight: 600;
  }
`;

export default MarkdownEditor;
