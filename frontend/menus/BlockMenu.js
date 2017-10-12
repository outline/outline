// @flow
import React, { Component } from 'react';
import Icon from 'components/Icon';
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
          <Icon type="Image" /> Add images
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInsertList}>
          <Icon type="List" /> Start list
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInsertTodoList}>
          <Icon type="CheckSquare" /> Start checklist
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInsertBreak}>
          <Icon type="Minus" /> Add break
        </DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default BlockMenu;
