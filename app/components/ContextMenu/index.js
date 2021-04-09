// @flow
import { rgba } from "polished";
import * as React from "react";
import { Menu } from "reakit/Menu";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { fadeAndScaleIn, fadeAndSlideIn } from "shared/styles/animations";
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
    <Menu hideOnClickOutside preventBodyScroll {...rest}>
      {(props) => (
        <Position {...props}>
          <Background>
            {rest.visible || rest.animating ? children : null}
          </Background>
        </Position>
      )}
    </Menu>
  );
}

const Position = styled.div`
  position: absolute;
  z-index: ${(props) => props.theme.depths.menu};

  ${breakpoint("mobile", "tablet")`
    position: fixed !important;
    transform: none !important;
    inset: auto 8px 0 8px !important;
  `};
`;

const Background = styled.div`
  animation: ${fadeAndSlideIn} 200ms ease;
  transform-origin: 50% 100%;
  max-width: 100%;
  background: ${(props) => props.theme.menuBackground};
  border: ${(props) =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  padding: 6px 0;
  min-width: 180px;
  overflow: hidden;
  overflow-y: auto;
  max-height: 75vh;
  box-shadow: ${(props) => props.theme.menuShadow};
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
    background: ${(props) => rgba(props.theme.menuBackground, 0.95)};
    border-radius: 6px;
  `};
`;
