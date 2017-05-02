// @flow
import React, { Component } from 'react';
import styles from '../Toolbar.scss';
import BoldIcon from 'components/Icon/BoldIcon';
import CodeIcon from 'components/Icon/CodeIcon';
import ItalicIcon from 'components/Icon/ItalicIcon';
import LinkIcon from 'components/Icon/LinkIcon';
import StrikethroughIcon from 'components/Icon/StrikethroughIcon';
import UnderlinedIcon from 'components/Icon/UnderlinedIcon';

export default class FormattingToolbar extends Component {
  props: {
    state: Object,
    onChange: Function,
  };

  /**
   * Check if the current selection has a mark with `type` in it.
   *
   * @param {String} type
   * @return {Boolean}
   */
  hasMark = type => {
    return this.props.state.marks.some(mark => mark.type === type);
  };

  /**
   * When a mark button is clicked, toggle the current mark.
   *
   * @param {Event} ev
   * @param {String} type
   */
  onClickMark = (ev, type) => {
    ev.preventDefault();
    let { state } = this.props;

    state = state.transform().toggleMark(type).apply();

    this.props.onChange(state);
  };

  renderMarkButton = (type, IconClass) => {
    const isActive = this.hasMark(type);
    const onMouseDown = e => this.onClickMark(e, type);

    return (
      <button
        className={styles.button}
        onMouseDown={onMouseDown}
        data-active={isActive}
      >
        <IconClass light />
      </button>
    );
  };

  /**
   * Convert the current selection into an empty link
   *
   * @param {Event} ev
   */
  makeLink = ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const transform = this.props.state.transform();
    const data = { href: '' };
    const state = transform.wrapInline({ type: 'link', data }).apply();
    this.props.onChange(state);
  };

  render() {
    return (
      <span>
        {this.renderMarkButton('bold', BoldIcon)}
        {this.renderMarkButton('italic', ItalicIcon)}
        {this.renderMarkButton('strikethrough', StrikethroughIcon)}
        {this.renderMarkButton('underlined', UnderlinedIcon)}
        {this.renderMarkButton('code', CodeIcon)}
        <button className={styles.button} onMouseDown={this.makeLink}>
          <LinkIcon light />
        </button>
      </span>
    );
  }
}
