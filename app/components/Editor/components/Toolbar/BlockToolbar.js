// @flow
import React, { Component } from 'react';
import keydown from 'react-keydown';
import styled from 'styled-components';
import getDataTransferFiles from 'utils/getDataTransferFiles';
import Heading1Icon from 'components/Icon/Heading1Icon';
import Heading2Icon from 'components/Icon/Heading2Icon';
import ImageIcon from 'components/Icon/ImageIcon';
import CodeIcon from 'components/Icon/CodeIcon';
import BulletedListIcon from 'components/Icon/BulletedListIcon';
import OrderedListIcon from 'components/Icon/OrderedListIcon';
import HorizontalRuleIcon from 'components/Icon/HorizontalRuleIcon';
import TodoListIcon from 'components/Icon/TodoListIcon';
import Flex from 'shared/components/Flex';
import ToolbarButton from './components/ToolbarButton';
import type { SlateNodeProps } from '../../types';
import { color } from 'shared/styles/constants';
import { fadeIn } from 'shared/styles/animations';
import { splitAndInsertBlock } from '../../transforms';

type Props = SlateNodeProps & {
  onInsertImage: *,
};

type Options = {
  type: string | Object,
  wrapper?: string | Object,
  append?: string | Object,
};

class BlockToolbar extends Component {
  props: Props;
  file: HTMLInputElement;

  componentWillReceiveProps(nextProps: Props) {
    const { editor } = this.props;
    const wasActive = editor.value.selection.hasEdgeIn(this.props.node);
    const isActive = nextProps.editor.value.selection.hasEdgeIn(nextProps.node);
    const becameInactive = !isActive && wasActive;

    if (becameInactive) {
      nextProps.editor.change(change =>
        change.removeNodeByKey(nextProps.node.key)
      );
    }
  }

  @keydown('esc')
  removeSelf(ev: SyntheticEvent) {
    ev.preventDefault();
    ev.stopPropagation();

    this.props.editor.change(change =>
      change.removeNodeByKey(this.props.node.key)
    );
  }

  insertBlock = (options: Options) => {
    const { editor } = this.props;

    editor.change(change => {
      splitAndInsertBlock(change, options);

      change.value.document.nodes.forEach(node => {
        if (node.type === 'block-toolbar') {
          change.removeNodeByKey(node.key);
        }
      });

      change.focus();
    });
  };

  handleClickBlock = (ev: SyntheticEvent, type: string) => {
    ev.preventDefault();

    switch (type) {
      case 'heading1':
      case 'heading2':
      case 'code':
        return this.insertBlock({ type });
      case 'horizontal-rule':
        return this.insertBlock({
          type: { type: 'horizontal-rule', isVoid: true },
        });
      case 'bulleted-list':
        return this.insertBlock({
          type: 'list-item',
          wrapper: 'bulleted-list',
        });
      case 'ordered-list':
        return this.insertBlock({
          type: 'list-item',
          wrapper: 'ordered-list',
        });
      case 'todo-list':
        return this.insertBlock({
          type: { type: 'list-item', data: { checked: false } },
          wrapper: 'todo-list',
        });
      case 'image':
        return this.onPickImage();
      default:
    }
  };

  onPickImage = () => {
    // simulate a click on the file upload input element
    this.file.click();
  };

  onImagePicked = async (ev: SyntheticEvent) => {
    const files = getDataTransferFiles(ev);
    for (const file of files) {
      await this.props.onInsertImage(file);
    }
  };

  renderBlockButton = (type: string, IconClass: Function) => {
    return (
      <ToolbarButton onMouseDown={ev => this.handleClickBlock(ev, type)}>
        <IconClass color={color.text} />
      </ToolbarButton>
    );
  };

  render() {
    const { editor, attributes, node } = this.props;
    const active =
      editor.value.isFocused && editor.value.selection.hasEdgeIn(node);

    return (
      <Bar active={active} {...attributes}>
        <HiddenInput
          type="file"
          innerRef={ref => (this.file = ref)}
          onChange={this.onImagePicked}
          accept="image/*"
        />
        {this.renderBlockButton('heading1', Heading1Icon)}
        {this.renderBlockButton('heading2', Heading2Icon)}
        <Separator />
        {this.renderBlockButton('bulleted-list', BulletedListIcon)}
        {this.renderBlockButton('ordered-list', OrderedListIcon)}
        {this.renderBlockButton('todo-list', TodoListIcon)}
        <Separator />
        {this.renderBlockButton('code', CodeIcon)}
        {this.renderBlockButton('horizontal-rule', HorizontalRuleIcon)}
        {this.renderBlockButton('image', ImageIcon)}
      </Bar>
    );
  }
}

const Separator = styled.div`
  height: 100%;
  width: 1px;
  background: ${color.smokeDark};
  display: inline-block;
  margin-left: 10px;
`;

const Bar = styled(Flex)`
  z-index: 100;
  animation: ${fadeIn} 150ms ease-in-out;
  position: relative;
  align-items: center;
  background: ${color.smoke};
  height: 44px;

  &:before,
  &:after {
    content: '';
    position: absolute;
    left: -100%;
    width: 100%;
    height: 44px;
    background: ${color.smoke};
  }

  &:after {
    left: auto;
    right: -100%;
  }
`;

const HiddenInput = styled.input`
  position: absolute;
  top: -100px;
  left: -100px;
  visibility: hidden;
`;

export default BlockToolbar;
