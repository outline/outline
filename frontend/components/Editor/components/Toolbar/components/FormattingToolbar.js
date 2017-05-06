// @flow
import React, { Component } from 'react';
import styles from '../Toolbar.scss';
import BoldIcon from 'components/Icon/BoldIcon';
import CodeIcon from 'components/Icon/CodeIcon';
import Heading1Icon from 'components/Icon/Heading1Icon';
import Heading2Icon from 'components/Icon/Heading2Icon';
import LinkIcon from 'components/Icon/LinkIcon';
import StrikethroughIcon from 'components/Icon/StrikethroughIcon';
import BulletedListIcon from 'components/Icon/BulletedListIcon';

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

  isBlock = type => {
    return this.props.state.startBlock.type === type;
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

  onClickBlock = (ev, type) => {
    ev.preventDefault();
    let { state } = this.props;

    state = state.transform().setBlock(type).apply();
    this.props.onChange(state);
  };

  renderMarkButton = (type, IconClass) => {
    const isActive = this.hasMark(type);
    const onMouseDown = ev => this.onClickMark(ev, type);

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

  renderBlockButton = (type, IconClass) => {
    const isActive = this.isBlock(type);
    const onMouseDown = ev =>
      this.onClickBlock(ev, isActive ? 'paragraph' : type);

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
  onCreateLink = ev => {
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
        {this.renderMarkButton('deleted', StrikethroughIcon)}
        {this.renderBlockButton('heading1', Heading1Icon)}
        {this.renderBlockButton('heading2', Heading2Icon)}
        {this.renderBlockButton('bulleted-list', BulletedListIcon)}
        {this.renderMarkButton('code', CodeIcon)}
        <button className={styles.button} onMouseDown={this.onCreateLink}>
          <LinkIcon light />
        </button>
      </span>
    );
  }
}
