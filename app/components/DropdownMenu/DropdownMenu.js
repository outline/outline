// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { PortalWithState } from 'react-portal';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import { fadeAndScaleIn } from 'shared/styles/animations';

type Props = {
  label: React.Node,
  onOpen?: () => void,
  onClose?: () => void,
  children?: React.Node,
  className?: string,
  style?: Object,
};

@observer
class DropdownMenu extends React.Component<Props> {
  @observable top: number;
  @observable right: number;

  handleOpen = (openPortal: (SyntheticEvent<*>) => *) => {
    return (ev: SyntheticMouseEvent<*>) => {
      ev.preventDefault();
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
    const { className, label, children } = this.props;

    return (
      <div className={className}>
        <PortalWithState
          onOpen={this.props.onOpen}
          onClose={this.props.onClose}
          closeOnOutsideClick
          closeOnEsc
        >
          {({ closePortal, openPortal, portal }) => (
            <React.Fragment>
              <Label onClick={this.handleOpen(openPortal)}>{label}</Label>
              {portal(
                <Menu
                  onClick={ev => {
                    ev.stopPropagation();
                    closePortal();
                  }}
                  style={this.props.style}
                  top={this.top}
                  right={this.right}
                >
                  {children}
                </Menu>
              )}
            </React.Fragment>
          )}
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

  background: ${props => props.theme.menuBackground};
  border-radius: 2px;
  padding: 0.5em 0;
  min-width: 180px;
  overflow: hidden;
  box-shadow: ${props => props.theme.menuShadow};

  @media print {
    display: none;
  }
`;

export default DropdownMenu;
