// @flow
import React, { Component } from 'react';
import invariant from 'invariant';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import { PortalWithState } from 'react-portal';
import Flex from 'shared/components/Flex';
import { color } from 'shared/styles/constants';
import { fadeAndScaleIn } from 'shared/styles/animations';

type Props = {
  label: React.Element<*>,
  onOpen?: () => void,
  onClose?: () => void,
  children?: React.Element<*>,
  style?: Object,
};

@observer
class DropdownMenu extends Component {
  props: Props;
  @observable top: number;
  @observable left: number;
  @observable right: number;

  handleOpen = (openPortal: SyntheticEvent => void) => {
    return (ev: SyntheticMouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const currentTarget = ev.currentTarget;
      invariant(document.body, 'why you not here');

      if (currentTarget instanceof HTMLDivElement) {
        const bodyRect = document.body.getBoundingClientRect();
        const targetRect = currentTarget.getBoundingClientRect();
        this.top = targetRect.bottom - bodyRect.top;
        this.right = bodyRect.width - targetRect.left - targetRect.width;
        openPortal(ev);
      }
    };
  };

  render() {
    return (
      <div>
        <PortalWithState
          onOpen={this.props.onOpen}
          onClose={this.props.onClose}
          closeOnEsc
          closeOnOutsideClick
        >
          {({ closePortal, openPortal, portal }) => [
            <Label onClick={this.handleOpen(openPortal)} key="label">
              {this.props.label}
            </Label>,
            portal(
              <Menu
                key="menu"
                onClick={closePortal}
                style={this.props.style}
                left={this.left}
                top={this.top}
                right={this.right}
              >
                {this.props.children}
              </Menu>
            ),
          ]}
        </PortalWithState>
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
  animation: ${fadeAndScaleIn} 200ms ease;
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
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.08);

  @media print {
    display: none;
  }
`;

export default DropdownMenu;
