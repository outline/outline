// @flow
import React, { Component } from 'react';
import styled from 'styled-components';
import Heading1Icon from 'components/Icon/Heading1Icon';
import Heading2Icon from 'components/Icon/Heading2Icon';
import ImageIcon from 'components/Icon/ImageIcon';
import CodeIcon from 'components/Icon/CodeIcon';
import BulletedListIcon from 'components/Icon/BulletedListIcon';
import OrderedListIcon from 'components/Icon/OrderedListIcon';
import HorizontalRuleIcon from 'components/Icon/HorizontalRuleIcon';
import TodoListIcon from 'components/Icon/TodoListIcon';
import Flex from 'shared/components/Flex';
import type { Props } from '../types';
import { color } from 'shared/styles/constants';
import ToolbarButton from './Toolbar/components/ToolbarButton';

class BlockToolbar extends Component {
  props: Props;

  onClickBlock = (ev: SyntheticEvent, type: string) => {
    // TODO
  };

  renderBlockButton = (type: string, IconClass: Function) => {
    return (
      <ToolbarButton onMouseDown={ev => this.onClickBlock(ev, type)}>
        <IconClass color={color.text} />
      </ToolbarButton>
    );
  };

  render() {
    const { state, node } = this.props;
    const active = state.isFocused && state.selection.hasEdgeIn(node);

    return (
      <Bar active={active}>
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
  position: relative;
  align-items: center;
  background: ${color.smoke};
  padding: 10px 0;
  height: 44px;

  &:before,
  &:after {
    content: "";
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

export default BlockToolbar;
