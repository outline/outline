// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Editor, Plain } from 'slate';
import keydown from 'react-keydown';
import type { Document, State, Editor as EditorType } from './types';
import getDataTransferFiles from 'utils/getDataTransferFiles';
import Flex from 'components/Flex';
import ClickablePadding from './components/ClickablePadding';
import Toolbar from './components/Toolbar';
import Placeholder from './components/Placeholder';
import Markdown from './serializer';
import createSchema from './schema';
import createPlugins from './plugins';
import insertImage from './insertImage';
import styled from 'styled-components';

type Props = {
  text: string,
  onChange: Function,
  onSave: Function,
  onCancel: Function,
  onImageUploadStart: Function,
  onImageUploadStop: Function,
  emoji: string,
  readOnly: boolean,
};

type KeyData = {
  isMeta: boolean,
  key: string,
};

@observer class MarkdownEditor extends Component {
  props: Props;
  editor: EditorType;
  schema: Object;
  plugins: Array<Object>;

  state: {
    state: State,
  };

  constructor(props: Props) {
    super(props);

    this.schema = createSchema();
    this.plugins = createPlugins({
      onImageUploadStart: props.onImageUploadStart,
      onImageUploadStop: props.onImageUploadStop,
    });

    if (props.text) {
      this.state = { state: Markdown.deserialize(props.text) };
    } else {
      this.state = { state: Plain.deserialize('') };
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

  onChange = (state: State) => {
    this.setState({ state });
  };

  onDocumentChange = (document: Document, state: State) => {
    this.props.onChange(Markdown.serialize(state));
  };

  handleDrop = async (ev: SyntheticEvent) => {
    // check if this event was already handled by the Editor
    if (ev.isDefaultPrevented()) return;

    // otherwise we'll handle this
    ev.preventDefault();
    ev.stopPropagation();

    const files = getDataTransferFiles(ev);
    for (const file of files) {
      await this.insertImageFile(file);
    }
  };

  insertImageFile = async (file: window.File) => {
    const state = this.editor.getState();
    let transform = state.transform();

    transform = await insertImage(
      transform,
      file,
      this.editor,
      this.props.onImageUploadStart,
      this.props.onImageUploadStop
    );
    this.editor.onChange(transform.apply());
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
    this.props.onSave({ redirect: false });
  }

  @keydown('esc')
  onCancel() {
    if (this.props.readOnly) return;
    this.props.onCancel();
  }

  // Handling of keyboard shortcuts within editor focus
  onKeyDown = (ev: SyntheticKeyboardEvent, data: KeyData, state: State) => {
    if (!data.isMeta) return;

    switch (data.key) {
      case 's':
        this.onSave(ev);
        return state;
      case 'enter':
        this.onSaveAndExit(ev);
        return state;
      case 'escape':
        this.onCancel();
        return state;
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
      <Flex
        onDrop={this.handleDrop}
        onDragOver={this.cancelEvent}
        onDragEnter={this.cancelEvent}
        align="flex-start"
        justify="center"
        auto
      >
        <MaxWidth column auto>
          <Header onClick={this.focusAtStart} readOnly={this.props.readOnly} />
          <Toolbar state={this.state.state} onChange={this.onChange} />
          <StyledEditor
            innerRef={ref => (this.editor = ref)}
            placeholder="Start with a title…"
            bodyPlaceholder="Insert witty platitude here"
            schema={this.schema}
            plugins={this.plugins}
            emoji={this.props.emoji}
            state={this.state.state}
            onKeyDown={this.onKeyDown}
            onChange={this.onChange}
            onDocumentChange={this.onDocumentChange}
            onSave={this.props.onSave}
            readOnly={this.props.readOnly}
          />
          <ClickablePadding
            onClick={!this.props.readOnly ? this.focusAtEnd : undefined}
            grow
          />
        </MaxWidth>
      </Flex>
    );
  };
}

const MaxWidth = styled(Flex)`
  max-width: 50em;
  height: 100%;
`;

const Header = styled(Flex)`
  height: 60px;
  flex-shrink: 0;
  align-items: flex-end;
  ${({ readOnly }) => !readOnly && 'cursor: text;'}
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

    .anchor {
      visibility: hidden;
      color: #dedede;
      padding-left: 0.25em;
    }

    &:hover {
      .anchor {
        visibility: visible;

        &:hover {
          color: #cdcdcd;
        }
      }
    }
  }

  h1:first-of-type {
    ${Placeholder} {
      visibility: visible;
    }
  }

  p:first-of-type {
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
`;

export default MarkdownEditor;
