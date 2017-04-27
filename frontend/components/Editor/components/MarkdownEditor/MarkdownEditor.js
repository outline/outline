import React, { Component } from 'react'
import { Editor } from 'slate';
import MarkdownSerializer from "slate-markdown-serializer";

const Markdown = new MarkdownSerializer();

/**
 * Define a schema.
 *
 * @type {Object}
 */
const schema = {
  nodes: {
    'block-quote': attrs => <blockquote>{ attrs.children }</blockquote>,
    'bulleted-list': attrs => <ul>{ attrs.children }</ul>,
    'heading1': attrs => <h1>{ attrs.children }</h1>,
    'heading2': attrs => <h2>{ attrs.children }</h2>,
    'heading3': attrs => <h3>{ attrs.children }</h3>,
    'heading4': attrs => <h4>{ attrs.children }</h4>,
    'heading5': attrs => <h5>{ attrs.children }</h5>,
    'heading6': attrs => <h6>{ attrs.children }</h6>,
    'list-item': attrs => <li>{ attrs.children }</li>,
  }
}

export default class MarkdownEditor extends Component {
  constructor(props) {
    super(props);

    this.state = { state: Markdown.deserialize(props.text) }
  }

  onChange = (state) => {
    this.setState({ state });
  }

  onDocumentChange = (document, state) => {
    this.props.onDocumentChange(Markdown.serialize(state));
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

  render = () => {
    return (
      <Editor
        schema={ schema }
        state={ this.state.state }
        onChange={ this.onChange }
        onDocumentChange={ this.onDocumentChange }
        onKeyDown={ this.onKeyDown }
      />
    )
  }
}
