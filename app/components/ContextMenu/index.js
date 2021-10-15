// @flow
import * as React from "react";
import { Portal } from "react-portal";
import { Menu } from "reakit/Menu";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import useMenuHeight from "hooks/useMenuHeight";
import usePrevious from "hooks/usePrevious";
import {
  fadeIn,
  fadeAndSlideUp,
  fadeAndSlideDown,
  mobileContextMenu,
} from "styles/animations";

type Props = {|
  "aria-label": string,
  visible?: boolean,
  placement?: string,
  animating?: boolean,
  children: React.Node,
  unstable_disclosureRef?: {
    current: null | React.ElementRef<"button">,
  },
  onOpen?: () => void,
  onClose?: () => void,
  hide?: () => void,
|};

export default function ContextMenu({
  children,
  onOpen,
  onClose,
  ...rest
}: Props) {
  const previousVisible = usePrevious(rest.visible);
  const maxHeight = useMenuHeight(rest.visible, rest.unstable_disclosureRef);
  const backgroundRef = React.useRef();

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

  // sets the menu height based on the available space between the disclosure/
  // trigger and the bottom of the window
  return (
    <>
      <Menu hideOnClickOutside preventBodyScroll {...rest}>
        {(props) => {
          // kind of hacky, but this is an effective way of telling which way
          // the menu will _actually_ be placed when taking into account screen
          // positioning.
          const topAnchor = props.style.top === "0";
          const rightAnchor = props.placement === "bottom-end";

          return (
            <Position {...props}>
              <Background
                dir="auto"
                topAnchor={topAnchor}
                rightAnchor={rightAnchor}
                ref={backgroundRef}
                style={maxHeight && topAnchor ? { maxHeight } : undefined}
              >
                {rest.visible || rest.animating ? children : null}
              </Background>
            </Position>
          );
        }}
      </Menu>
      {(rest.visible || rest.animating) && (
        <Portal>
          <Backdrop onClick={rest.hide} />
        </Portal>
      )}
    </>
  );
}

export const Backdrop = styled.div`
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

export const Position = styled.div`
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

export const Background = styled.div`
  animation: ${mobileContextMenu} 200ms ease;
  transform-origin: 50% 100%;
  max-width: 100%;
  background: ${(props) => props.theme.menuBackground};
  border-radius: 6px;
  padding: 6px 0;
  min-width: 180px;
  min-height: 44px;
  overflow: hidden;
  overflow-y: auto;
  max-height: 75vh;
  pointer-events: all;
  font-weight: normal;

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    animation: ${(props) =>
      props.topAnchor ? fadeAndSlideDown : fadeAndSlideUp} 200ms ease;
    transform-origin: ${(props) => (props.rightAnchor ? "75%" : "25%")} 0;
    max-width: 276px;
    background: ${(props) => props.theme.menuBackground};
    box-shadow: ${(props) => props.theme.menuShadow};
  `};
`;
