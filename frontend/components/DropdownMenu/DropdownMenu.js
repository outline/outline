// @flow
import React, { Component } from 'react';
import invariant from 'invariant';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import Portal from 'react-portal';
import Flex from 'components/Flex';
import { color } from 'styles/constants';
import { fadeAndScaleIn } from 'styles/animations';

type Props = {
  label: React.Element<*>,
  onOpen?: () => void,
  onClose?: () => void,
  children?: React.Element<*>,
  style?: Object,
};

@observer class DropdownMenu extends Component {
  props: Props;
  actionRef: Object;
  @observable open: boolean = false;
  @observable top: number;
  @observable left: number;
  @observable right: number;

  handleClick = (ev: SyntheticEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    const currentTarget = ev.currentTarget;
    invariant(document.body, 'why you not here');

    if (currentTarget instanceof HTMLDivElement) {
      const bodyRect = document.body.getBoundingClientRect();
      const targetRect = currentTarget.getBoundingClientRect();
      this.open = true;
      this.top = targetRect.bottom - bodyRect.top;
      this.right = bodyRect.width - targetRect.left - targetRect.width;
      if (this.props.onOpen) this.props.onOpen();
    }
  };

  handleClose = (ev: SyntheticEvent) => {
    this.open = false;
    if (this.props.onClose) this.props.onClose();
  };

  render() {
    return (
      <div>
        <Label
          onClick={this.handleClick}
          innerRef={ref => (this.actionRef = ref)}
        >
          {this.props.label}
        </Label>
        <Portal
          closeOnEsc
          closeOnOutsideClick
          isOpened={this.open}
          onClose={this.handleClose}
        >
          <Menu
            onClick={this.handleClose}
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
