// @flow
import React, { Component } from 'react';
import Icon from 'components/Icon';
import { observer } from 'mobx-react';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

@observer class BlockMenu extends Component {
  props: {
    label?: React$Element<any>,
    onPickImage: () => void,
    onInsertList: () => void,
    onInsertTodoList: () => void,
    onInsertBreak: () => void,
  };

  render() {
    return (
      <DropdownMenu
        style={{ marginRight: -70, marginTop: 5 }}
        label={this.props.label}
      >
        <DropdownMenuItem onClick={this.props.onPickImage}>
          <Icon type="Image" /> Add images
        </DropdownMenuItem>
        <DropdownMenuItem onClick={this.props.onInsertList}>
          <Icon type="List" /> Start list
        </DropdownMenuItem>
        <DropdownMenuItem onClick={this.props.onInsertTodoList}>
          <Icon type="CheckSquare" /> Start checklist
        </DropdownMenuItem>
        <DropdownMenuItem onClick={this.props.onInsertBreak}>
          <Icon type="Minus" /> Add break
        </DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default BlockMenu;
