import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import { Menu } from "reakit/Menu";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths } from "@shared/styles";
import useMenuContext from "~/hooks/useMenuContext";
import useMenuHeight from "~/hooks/useMenuHeight";
import usePrevious from "~/hooks/usePrevious";
import useStores from "~/hooks/useStores";
import useUnmount from "~/hooks/useUnmount";
import {
  fadeIn,
  fadeAndSlideUp,
  fadeAndSlideDown,
  mobileContextMenu,
} from "~/styles/animations";

export type Placement =
  | "auto-start"
  | "auto"
  | "auto-end"
  | "top-start"
  | "top"
  | "top-end"
  | "right-start"
  | "right"
  | "right-end"
  | "bottom-end"
  | "bottom"
  | "bottom-start"
  | "left-end"
  | "left"
  | "left-start";

type Props = {
  "aria-label": string;
  visible?: boolean;
  placement?: Placement;
  animating?: boolean;
  unstable_disclosureRef?: React.RefObject<HTMLElement | null>;
  onOpen?: () => void;
  onClose?: () => void;
  hide?: () => void;
};

const ContextMenu: React.FC<Props> = ({
  children,
  onOpen,
  onClose,
  ...rest
}) => {
  const previousVisible = usePrevious(rest.visible);
  const maxHeight = useMenuHeight(rest.visible, rest.unstable_disclosureRef);
  const backgroundRef = React.useRef<HTMLDivElement>(null);
  const { ui } = useStores();
  const { t } = useTranslation();
  const { setIsMenuOpen } = useMenuContext();

  useUnmount(() => {
    setIsMenuOpen(false);
  });

  React.useEffect(() => {
    if (rest.visible && !previousVisible) {
      if (onOpen) {
        onOpen();
      }
      if (rest["aria-label"] !== t("Submenu")) {
        setIsMenuOpen(true);
      }
    }

    if (!rest.visible && previousVisible) {
      if (onClose) {
        onClose();
      }
      if (rest["aria-label"] !== t("Submenu")) {
        setIsMenuOpen(false);
      }
    }
  }, [
    onOpen,
    onClose,
    previousVisible,
    rest.visible,
    ui.sidebarCollapsed,
    setIsMenuOpen,
    rest,
    t,
  ]);

  // Perf win – don't render anything until the menu has been opened
  if (!rest.visible && !previousVisible) {
    return null;
  }

  // sets the menu height based on the available space between the disclosure/
  // trigger and the bottom of the window
  return (
    <>
      <Menu hideOnClickOutside preventBodyScroll {...rest}>
        {(props) => {
          // kind of hacky, but this is an effective way of telling which way
          // the menu will _actually_ be placed when taking into account screen
          // positioning.
          const topAnchor = props.style?.top === "0";
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'placement' does not exist on type 'Extra... Remove this comment to see the full error message
          const rightAnchor = props.placement === "bottom-end";

          return (
            <Position {...props}>
              <Background
                dir="auto"
                topAnchor={topAnchor}
                rightAnchor={rightAnchor}
                ref={backgroundRef}
                style={
                  maxHeight && topAnchor
                    ? {
                        maxHeight,
                      }
                    : undefined
                }
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
};

export default ContextMenu;

export const Backdrop = styled.div`
  animation: ${fadeIn} 200ms ease-in-out;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${(props) => props.theme.backdrop};
  z-index: ${depths.menu - 1};

  ${breakpoint("tablet")`
    display: none;
  `};
`;

export const Position = styled.div`
  position: absolute;
  z-index: ${depths.menu};

  // overrides make mobile-first coding style challenging
  // so we explicitly define mobile breakpoint here
  ${breakpoint("mobile", "tablet")`
    position: fixed !important;
    transform: none !important;
    top: auto !important;
    right: 8px !important;
    bottom: 16px !important;
    left: 8px !important;
  `};
`;

export const Background = styled.div<{
  topAnchor?: boolean;
  rightAnchor?: boolean;
}>`
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
    animation: ${(props: any) =>
      props.topAnchor ? fadeAndSlideDown : fadeAndSlideUp} 200ms ease;
    transform-origin: ${(props: any) => (props.rightAnchor ? "75%" : "25%")} 0;
    max-width: 276px;
    background: ${(props: any) => props.theme.menuBackground};
    box-shadow: ${(props: any) => props.theme.menuShadow};
  `};
`;
