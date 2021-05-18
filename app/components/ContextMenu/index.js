// @flow
import * as React from "react";
import { Portal } from "react-portal";
import { Menu } from "reakit/Menu";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import {
  fadeIn,
  fadeAndScaleIn,
  fadeAndSlideIn,
} from "shared/styles/animations";
import usePrevious from "hooks/usePrevious";

type Props = {|
  "aria-label": string,
  visible?: boolean,
  animating?: boolean,
  children: React.Node,
  onOpen?: () => void,
  onClose?: () => void,
|};

export default function ContextMenu({
  children,
  onOpen,
  onClose,
  ...rest
}: Props) {
  const previousVisible = usePrevious(rest.visible);

  React.useEffect(() => {
    if (rest.visible && !previousVisible) {
      if (onOpen) {
        onOpen();
      }
    }
    if (!rest.visible && previousVisible) {
      if (onClose) {
        onClose();
      }
    }
  }, [onOpen, onClose, previousVisible, rest.visible]);

  return (
    <>
      <Menu hideOnClickOutside preventBodyScroll {...rest}>
        {(props) => (
          <Position {...props}>
            <Background>
              {rest.visible || rest.animating ? children : null}
            </Background>
          </Position>
        )}
      </Menu>
      {(rest.visible || rest.animating) && (
        <Portal>
          <Backdrop />
        </Portal>
      )}
    </>
  );
}

const Backdrop = styled.div`
  animation: ${fadeIn} 200ms ease-in-out;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${(props) => props.theme.backdrop};
  z-index: ${(props) => props.theme.depths.menu - 1};

  ${breakpoint("tablet")`
    display: none;
  `};
`;

const Position = styled.div`
  position: absolute;
  z-index: ${(props) => props.theme.depths.menu};

  ${breakpoint("mobile", "tablet")`
    position: fixed !important;
    transform: none !important;
    top: auto !important;
    right: 8px !important;
    bottom: 16px !important;
    left: 8px !important;
  `};
`;

const Background = styled.div`
  animation: ${fadeAndSlideIn} 200ms ease;
  transform-origin: 50% 100%;
  max-width: 100%;
  background: ${(props) => props.theme.menuBackground};
  border-radius: 6px;
  padding: 6px 0;
  min-width: 180px;
  overflow: hidden;
  overflow-y: auto;
  max-height: 75vh;
  pointer-events: all;
  font-weight: normal;

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    animation: ${fadeAndScaleIn} 200ms ease;
    transform-origin: ${(props) =>
      props.left !== undefined ? "25%" : "75%"} 0;
    max-width: 276px;
    background: ${(props) => props.theme.menuBackground};
    box-shadow: ${(props) => props.theme.menuShadow};
    border: ${(props) =>
      props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  `};
`;
