// @flow
import React, { Component } from 'react';
import type { State } from '../../../types';
import ToolbarButton from './ToolbarButton';
import BoldIcon from 'components/Icon/BoldIcon';
import CodeIcon from 'components/Icon/CodeIcon';
import Heading1Icon from 'components/Icon/Heading1Icon';
import Heading2Icon from 'components/Icon/Heading2Icon';
import ItalicIcon from 'components/Icon/ItalicIcon';
import LinkIcon from 'components/Icon/LinkIcon';
import StrikethroughIcon from 'components/Icon/StrikethroughIcon';

export default class FormattingToolbar extends Component {
  props: {
    state: State,
    onChange: Function,
    onCreateLink: Function,
  };

  /**
   * Check if the current selection has a mark with `type` in it.
   *
   * @param {String} type
   * @return {Boolean}
   */
  hasMark = (type: string) => {
    return this.props.state.marks.some(mark => mark.type === type);
  };

  isBlock = (type: string) => {
    return this.props.state.startBlock.type === type;
  };

  /**
   * When a mark button is clicked, toggle the current mark.
   *
   * @param {Event} ev
   * @param {String} type
   */
  onClickMark = (ev: SyntheticEvent, type: string) => {
    ev.preventDefault();
    let { state } = this.props;

    state = state.transform().toggleMark(type).apply();
    this.props.onChange(state);
  };

  onClickBlock = (ev: SyntheticEvent, type: string) => {
    ev.preventDefault();
    let { state } = this.props;

    state = state.transform().setBlock(type).apply();
    this.props.onChange(state);
  };

  onCreateLink = (ev: SyntheticEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    let { state } = this.props;
    const data = { href: '' };
    state = state.transform().wrapInline({ type: 'link', data }).apply();
    this.props.onChange(state);
    this.props.onCreateLink();
  };

  renderMarkButton = (type: string, IconClass: Function) => {
    const isActive = this.hasMark(type);
    const onMouseDown = ev => this.onClickMark(ev, type);

    return (
      <ToolbarButton onMouseDown={onMouseDown} active={isActive}>
        <IconClass light />
      </ToolbarButton>
    );
  };

  renderBlockButton = (type: string, IconClass: Function) => {
    const isActive = this.isBlock(type);
    const onMouseDown = ev =>
      this.onClickBlock(ev, isActive ? 'paragraph' : type);

    return (
      <ToolbarButton onMouseDown={onMouseDown} active={isActive}>
        <IconClass light />
      </ToolbarButton>
    );
  };

  render() {
    return (
      <span>
        {this.renderMarkButton('bold', BoldIcon)}
        {this.renderMarkButton('italic', ItalicIcon)}
        {this.renderMarkButton('deleted', StrikethroughIcon)}
        {this.renderBlockButton('heading1', Heading1Icon)}
        {this.renderBlockButton('heading2', Heading2Icon)}
        {this.renderMarkButton('code', CodeIcon)}
        <ToolbarButton onMouseDown={this.onCreateLink}>
          <LinkIcon light />
        </ToolbarButton>
      </span>
    );
  }
}
