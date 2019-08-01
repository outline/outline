// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { PortalWithState } from 'react-portal';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import { fadeAndScaleIn } from 'shared/styles/animations';

let previousClosePortal;

type Children =
  | React.Node
  | ((options: { closePortal: () => void }) => React.Node);

type Props = {
  label: React.Node,
  onOpen?: () => void,
  onClose?: () => void,
  children?: Children,
  className?: string,
  style?: Object,
  position?: 'left' | 'right' | 'center',
};

@observer
class DropdownMenu extends React.Component<Props> {
  @observable top: number;
  @observable right: number;
  @observable left: number;

  handleOpen = (
    openPortal: (SyntheticEvent<*>) => void,
    closePortal: () => void
  ) => {
    return (ev: SyntheticMouseEvent<*>) => {
      ev.preventDefault();
      const currentTarget = ev.currentTarget;
      invariant(document.body, 'why you not here');

      if (currentTarget instanceof HTMLDivElement) {
        const bodyRect = document.body.getBoundingClientRect();
        const targetRect = currentTarget.getBoundingClientRect();
        this.top = targetRect.bottom - bodyRect.top;

        if (this.props.position === 'left') {
          this.left = targetRect.left;
        } else if (this.props.position === 'center') {
          this.left = targetRect.left + targetRect.width / 2;
        } else {
          this.right = bodyRect.width - targetRect.left - targetRect.width;
        }

        // attempt to keep only one flyout menu open at once
        if (previousClosePortal) {
          previousClosePortal();
        }
        previousClosePortal = closePortal;
        openPortal(ev);
      }
    };
  };

  render() {
    const { className, label, position, children } = this.props;

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
              <Label onClick={this.handleOpen(openPortal, closePortal)}>
                {label}
              </Label>
              {portal(
                <Position
                  position={position}
                  top={this.top}
                  left={this.left}
                  right={this.right}
                >
                  <Menu
                    onClick={
                      typeof children === 'function'
                        ? undefined
                        : ev => {
                            ev.stopPropagation();
                            closePortal();
                          }
                    }
                    style={this.props.style}
                  >
                    {typeof children === 'function'
                      ? children({ closePortal })
                      : children}
                  </Menu>
                </Position>
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

const Position = styled.div`
  position: absolute;
  ${({ left }) => (left !== undefined ? `left: ${left}px` : '')};
  ${({ right }) => (right !== undefined ? `right: ${right}px` : '')};
  top: ${({ top }) => top}px;
  z-index: 1000;
  transform: ${props =>
    props.position === 'center' ? 'translateX(-50%)' : 'initial'};
`;

const Menu = styled.div`
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: ${props => (props.left !== undefined ? '25%' : '75%')} 0;
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
