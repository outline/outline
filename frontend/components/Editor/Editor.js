// @flow
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Editor, Plain } from 'slate';
import keydown from 'react-keydown';
import classnames from 'classnames/bind';
import type { Document, State, Editor as EditorType } from './types';
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
      <Container auto column>
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
      </Container>
    );
  };
}

MarkdownEditor.childContextTypes = {
  starred: PropTypes.bool,
};

const Container = styled(Flex)`
  height: 100%;
`;

const HeaderContainer = styled(Flex).attrs({
  align: 'flex-end',
})`
  height: 100px;
  ${({ readOnly }) => !readOnly && 'cursor: text;'}
`;

export default MarkdownEditor;
