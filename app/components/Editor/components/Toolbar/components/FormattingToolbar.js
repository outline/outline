// @flow
import React, { Component } from 'react';
import styled from 'styled-components';
import { Editor } from 'slate-react';
import ToolbarButton from './ToolbarButton';
import BoldIcon from 'components/Icon/BoldIcon';
import CodeIcon from 'components/Icon/CodeIcon';
import Heading1Icon from 'components/Icon/Heading1Icon';
import Heading2Icon from 'components/Icon/Heading2Icon';
import ItalicIcon from 'components/Icon/ItalicIcon';
import LinkIcon from 'components/Icon/LinkIcon';
import StrikethroughIcon from 'components/Icon/StrikethroughIcon';

class FormattingToolbar extends Component {
  props: {
    editor: Editor,
    onCreateLink: () => void,
  };

  /**
   * Check if the current selection has a mark with `type` in it.
   *
   * @param {String} type
   * @return {Boolean}
   */
  hasMark = (type: string) => {
    return this.props.editor.value.marks.some(mark => mark.type === type);
  };

  isBlock = (type: string) => {
    return this.props.editor.value.startBlock.type === type;
  };

  /**
   * When a mark button is clicked, toggle the current mark.
   *
   * @param {Event} ev
   * @param {String} type
   */
  onClickMark = (ev: SyntheticEvent, type: string) => {
    ev.preventDefault();
    this.props.editor.change(change => change.toggleMark(type));
  };

  onClickBlock = (ev: SyntheticEvent, type: string) => {
    ev.preventDefault();
    this.props.editor.change(change => change.setBlock(type));
  };

  onCreateLink = (ev: SyntheticEvent) => {
    ev.preventDefault();
    ev.stopPropagation();

    const data = { href: '' };
    this.props.editor.change(change =>
      change.wrapInline({ type: 'link', data })
    );
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
        {this.renderMarkButton('code', CodeIcon)}
        <Separator />
        {this.renderBlockButton('heading1', Heading1Icon)}
        {this.renderBlockButton('heading2', Heading2Icon)}
        <Separator />
        <ToolbarButton onMouseDown={this.onCreateLink}>
          <LinkIcon light />
        </ToolbarButton>
      </span>
    );
  }
}

const Separator = styled.div`
  height: 100%;
  width: 1px;
  background: #fff;
  opacity: 0.2;
  display: inline-block;
  margin-left: 10px;
`;

export default FormattingToolbar;
