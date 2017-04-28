import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Editor, Raw } from 'slate';
import ClickablePadding from './components/ClickablePadding';
import schema from './schema';
import Markdown from './serializer';
import styles from './Editor.scss';

const placeholder = {
  "nodes": [
    {
      "kind": "block",
      "type": "heading1"
    }
  ]
}

@observer
export default class SlateEditor extends Component {
  static propTypes = {
    text: React.PropTypes.string,
    onChange: React.PropTypes.func.isRequired,
    replaceText: React.PropTypes.func.isRequired,
    onSave: React.PropTypes.func.isRequired,
    onCancel: React.PropTypes.func.isRequired,
    toggleUploadingIndicator: React.PropTypes.func,
  }

  constructor(props) {
    super(props);

    if (props.text) {
      this.state = { state: Markdown.deserialize(props.text) }
    } else {
      this.state = { state: Raw.deserialize(placeholder, { terse: true }) }
    }
  }

  onChange = (state) => {
    this.setState({ state });
  }

  onDocumentChange = (document, state) => {
    this.props.onChange(Markdown.serialize(state));
  }

  /**
   * On key down, check for our specific key shortcuts.
   *
   * @param {Event} e
   * @param {Data} data
   * @param {State} state
   * @return {State or Null} state
   */
  onKeyDown = (e, data, state) => {
    switch (data.key) {
      case 'space': return this.onSpace(e, state)
      case 'backspace': return this.onBackspace(e, state)
      case 'enter': return this.onEnter(e, state)
      default: return null;
    }
  }

  /**
   * On space, if it was after an auto-markdown shortcut, convert the current
   * node into the shortcut's corresponding type.
   *
   * @param {Event} e
   * @param {State} state
   * @return {State or Null} state
   */
  onSpace = (e, state) => {
    if (state.isExpanded) return
    const { startBlock, startOffset } = state
    const chars = startBlock.text.slice(0, startOffset).replace(/\s*/g, '')
    const type = this.getType(chars)

    if (!type) return
    if (type === 'list-item' && startBlock.type === 'list-item') return
    e.preventDefault()

    const transform = state
      .transform()
      .setBlock(type)

    if (type === 'list-item') transform.wrapBlock('bulleted-list')

    state = transform
      .extendToStartOf(startBlock)
      .delete()
      .apply()

    return state;
  }

  /**
   * On backspace, if at the start of a non-paragraph, convert it back into a
   * paragraph node.
   *
   * @param {Event} e
   * @param {State} state
   * @return {State or Null} state
   */
  onBackspace = (e, state) => {
    if (state.isExpanded) return
    if (state.startOffset !== 0) return
    const { startBlock } = state

    if (startBlock.type === 'paragraph') return
    e.preventDefault()

    const transform = state
      .transform()
      .setBlock('paragraph')

    if (startBlock.type === 'list-item') transform.unwrapBlock('bulleted-list')

    state = transform.apply()
    return state;
  }

  /**
   * On return, if at the end of a node type that should not be extended,
   * create a new paragraph below it.
   *
   * @param {Event} e
   * @param {State} state
   * @return {State or Null} state
   */
  onEnter = (ev, state) => {
    if (state.isExpanded) return
    const { startBlock, startOffset, endOffset } = state
    if (startOffset === 0 && startBlock.length === 0) return this.onBackspace(ev, state)
    if (endOffset !== startBlock.length) return

    if (
      startBlock.type !== 'heading1' &&
      startBlock.type !== 'heading2' &&
      startBlock.type !== 'heading3' &&
      startBlock.type !== 'heading4' &&
      startBlock.type !== 'heading5' &&
      startBlock.type !== 'heading6' &&
      startBlock.type !== 'block-quote'
    ) {
      return
    }

    ev.preventDefault();

    return state
      .transform()
      .splitBlock()
      .setBlock('paragraph')
      .apply();
  }

  /**
   * Get the block type for a series of auto-markdown shortcut `chars`.
   *
   * @param {String} chars
   * @return {String} block
   */
  getType = (chars) => {
    switch (chars) {
      case '*':
      case '-':
      case '+': return 'list-item'
      case '>': return 'block-quote'
      case '#': return 'heading1'
      case '##': return 'heading2'
      case '###': return 'heading3'
      case '####': return 'heading4'
      case '#####': return 'heading5'
      case '######': return 'heading6'
      default: return null
    }
  }

  focusAtStart = () => {
    const state = this.editor.getState();
    const transform = state.transform();
    transform.collapseToStartOf(state.document);
    transform.focus();
    this.setState({state: transform.apply() });
  }

  focusAtEnd = () => {
    const state = this.editor.getState();
    const transform = state.transform();
    transform.collapseToEndOf(state.document);
    transform.focus();
    this.setState({state: transform.apply() });
  }

  render = () => {
    return (
      <span className={ styles.container }>
        <ClickablePadding onClick={ this.focusAtStart } />
        <Editor
          ref={ ref => (this.editor = ref) }
          placeholder={ <h1># Start with a title…</h1> }
          placeholderClassName={ styles.placeholder }
          schema={ schema }
          state={ this.state.state }
          onChange={ this.onChange }
          onDocumentChange={ this.onDocumentChange }
          onKeyDown={ this.onKeyDown }
        />
      <ClickablePadding onClick={ this.focusAtEnd } grow />
      </span>
    );
  }
}
