// @flow
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Editor, Plain } from 'slate';
import keydown from 'react-keydown';
import classnames from 'classnames/bind';
import type { Document, State, Editor as EditorType } from './types';
import getDataTransferFiles from 'utils/getDataTransferFiles';
import uploadFile from 'utils/uploadFile';
import Flex from 'components/Flex';
import ClickablePadding from './components/ClickablePadding';
import Toolbar from './components/Toolbar';
import Markdown from './serializer';
import createSchema from './schema';
import createPlugins from './plugins';
import styled from 'styled-components';
import styles from './Editor.scss';

const cx = classnames.bind(styles);

type Props = {
  text: string,
  onChange: Function,
  onSave: Function,
  onCancel: Function,
  onStar: Function,
  onUnstar: Function,
  onImageUploadStart: Function,
  onImageUploadStop: Function,
  starred: boolean,
  readOnly: boolean,
  heading?: ?React.Element<*>,
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

    this.schema = createSchema({
      onStar: props.onStar,
      onUnstar: props.onUnstar,
    });
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

  componentDidUpdate(prevProps: Props) {
    if (prevProps.readOnly && !this.props.readOnly) {
      this.focusAtEnd();
    }
  }

  getChildContext() {
    return { starred: this.props.starred };
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
      await this.insertFile(file);
    }
  };

  insertFile = async (file: Object) => {
    this.props.onImageUploadStart();
    const asset = await uploadFile(file);
    const state = this.editor.getState();
    const transform = state.transform();
    transform.collapseToEndOf(state.document);
    transform.insertBlock({
      type: 'image',
      isVoid: true,
      data: { src: asset.url, alt: file.name },
    });
    this.props.onImageUploadStop();
    this.setState({ state: transform.apply() });
  };

  cancelEvent = (ev: SyntheticEvent) => {
    ev.preventDefault();
  };

  @keydown('meta+s')
  onSaveAndContinue(ev: SyntheticKeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.onSave();
  }

  @keydown('meta+enter')
  onSave(ev: SyntheticKeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.onSave({ redirect: false });
  }

  @keydown('esc')
  onCancel() {
    this.props.onCancel();
  }

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
          <HeaderContainer
            onClick={this.focusAtStart}
            readOnly={this.props.readOnly}
          >
            {this.props.heading}
          </HeaderContainer>
          <Toolbar state={this.state.state} onChange={this.onChange} />
          <Editor
            key={this.props.starred}
            ref={ref => (this.editor = ref)}
            placeholder="Start with a title..."
            className={cx(styles.editor, { readOnly: this.props.readOnly })}
            schema={this.schema}
            plugins={this.plugins}
            state={this.state.state}
            onChange={this.onChange}
            onDocumentChange={this.onDocumentChange}
            onSave={this.props.onSave}
            readOnly={this.props.readOnly}
          />
          {!this.props.readOnly &&
            <ClickablePadding onClick={this.focusAtEnd} grow />}
        </MaxWidth>
      </Flex>
    );
  };
}

MarkdownEditor.childContextTypes = {
  starred: PropTypes.bool,
};

const MaxWidth = styled(Flex)`
  max-width: 50em;
  height: 100%;
`;

const HeaderContainer = styled(Flex).attrs({
  align: 'flex-end',
})`
  height: 100px;
  ${({ readOnly }) => !readOnly && 'cursor: text;'}
`;

export default MarkdownEditor;
