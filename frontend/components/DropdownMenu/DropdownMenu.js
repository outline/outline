// @flow
import React from 'react';
import invariant from 'invariant';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import Portal from 'react-portal';
import Flex from 'components/Flex';
import { color } from 'styles/constants';
import { fadeAndScaleIn } from 'styles/animations';

type DropdownMenuProps = {
  label: React.Element<any>,
  onShow?: Function,
  onClose?: Function,
  children?: React.Element<any>,
  style?: Object,
};

@observer class DropdownMenu extends React.Component {
  props: DropdownMenuProps;
  actionRef: Object;
  @observable open: boolean = false;
  @observable top: number;
  @observable left: number;
  @observable right: number;

  handleClick = (ev: SyntheticEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    invariant(document.body, 'why you not here');
    const bodyRect = document.body.getBoundingClientRect();
    // $FlowIssue it's there
    const targetRect = ev.currentTarget.getBoundingClientRect();
    this.open = true;
    this.top = targetRect.bottom - bodyRect.top;
    this.right = bodyRect.width - targetRect.left - targetRect.width;
    if (this.props.onShow) this.props.onShow();
  };

  handleClose = (ev: SyntheticEvent) => {
    this.open = false;
    if (this.props.onClose) this.props.onClose();
  };

  render() {
    const openAction = (
      <Label
        onClick={this.handleClick}
        innerRef={ref => (this.actionRef = ref)}
      >
        {this.props.label}
      </Label>
    );

    return (
      <div>
        {openAction}
        <Portal
          closeOnEsc
          closeOnOutsideClick
          isOpened={this.open}
          onClose={this.handleClose}
        >
          <Menu
            style={this.props.style}
            left={this.left}
            top={this.top}
            right={this.right}
          >
            {this.props.children}
          </Menu>
        </Portal>
      </div>
    );
  }
}

const Label = styled(Flex).attrs({
  justify: 'center',
  align: 'center',
})`
  width: 22px;
  height: 22px;
  z-index: 1000;
  cursor: pointer;
`;

const Menu = styled.div`
  animation: ${fadeAndScaleIn} 250ms ease;
  transform-origin: 75% 0;

  position: absolute;
  right: ${({ right }) => right}px;
  top: ${({ top }) => top}px;
  z-index: 1000;
  border: ${color.slateLight};
  background: ${color.white};
  border-radius: 2px;
  min-width: 160px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0,0,0,.05), 0 4px 8px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.08);
`;

export default DropdownMenu;
