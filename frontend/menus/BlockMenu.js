// @flow
import React, { Component } from 'react';
import ImageIcon from 'components/Icon/ImageIcon';
import BulletedListIcon from 'components/Icon/BulletedListIcon';
import HorizontalRuleIcon from 'components/Icon/HorizontalRuleIcon';
import TodoListIcon from 'components/Icon/TodoListIcon';
import { observer } from 'mobx-react';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

@observer class BlockMenu extends Component {
  props: {
    label?: React$Element<*>,
    onPickImage: SyntheticEvent => void,
    onInsertList: SyntheticEvent => void,
    onInsertTodoList: SyntheticEvent => void,
    onInsertBreak: SyntheticEvent => void,
  };

  render() {
    const {
      label,
      onPickImage,
      onInsertList,
      onInsertTodoList,
      onInsertBreak,
      ...rest
    } = this.props;

    return (
      <DropdownMenu
        style={{ marginRight: -70, marginTop: 5 }}
        label={label}
        {...rest}
      >
        <DropdownMenuItem onClick={onPickImage}>
          <ImageIcon /> Add images
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInsertList}>
          <BulletedListIcon /> Start list
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInsertTodoList}>
          <TodoListIcon /> Start checklist
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInsertBreak}>
          <HorizontalRuleIcon /> Add break
        </DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default BlockMenu;
