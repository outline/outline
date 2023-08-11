import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Menu, MenuStateReturn } from "reakit/Menu";
import styled, { DefaultTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import Scrollable from "~/components/Scrollable";
import useMenuContext from "~/hooks/useMenuContext";
import useMenuHeight from "~/hooks/useMenuHeight";
import useMobile from "~/hooks/useMobile";
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

type Props = MenuStateReturn & {
  "aria-label"?: string;
  /** The parent menu state if this is a submenu. */
  parentMenuState?: Omit<MenuStateReturn, "items">;
  /** Called when the context menu is opened. */
  onOpen?: () => void;
  /** Called when the context menu is closed. */
  onClose?: () => void;
  /** Called when the context menu is clicked. */
  onClick?: (ev: React.MouseEvent) => void;
  children?: React.ReactNode;
};

const ContextMenu: React.FC<Props> = ({
  children,
  onOpen,
  onClose,
  parentMenuState,
  ...rest
}: Props) => {
  const previousVisible = usePrevious(rest.visible);
  const maxHeight = useMenuHeight({
    visible: rest.visible,
    elementRef: rest.unstable_disclosureRef,
  });
  const backgroundRef = React.useRef<HTMLDivElement>(null);
  const { ui } = useStores();
  const { t } = useTranslation();
  const { setIsMenuOpen } = useMenuContext();
  const isMobile = useMobile();
  const isSubMenu = !!parentMenuState;

  useUnmount(() => {
    setIsMenuOpen(false);
  });

  React.useEffect(() => {
    if (rest.visible && !previousVisible) {
      onOpen?.();

      if (!isSubMenu) {
        setIsMenuOpen(true);
      }
    }

    if (!rest.visible && previousVisible) {
      onClose?.();

      if (!isSubMenu) {
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
    isSubMenu,
    t,
  ]);

  // We must manually manage scroll lock for iOS support so that the scrollable
  // element can be passed into body-scroll-lock. See:
  // https://github.com/ariakit/ariakit/issues/469
  React.useEffect(() => {
    const scrollElement = backgroundRef.current;
    if (rest.visible && scrollElement && !isSubMenu) {
      disableBodyScroll(scrollElement, {
        reserveScrollBarGap: true,
      });
    }
    return () => {
      scrollElement && !isSubMenu && enableBodyScroll(scrollElement);
    };
  }, [isSubMenu, rest.visible]);

  // Perf win – don't render anything until the menu has been opened
  if (!rest.visible && !previousVisible) {
    return null;
  }

  // sets the menu height based on the available space between the disclosure/
  // trigger and the bottom of the window
  return (
    <>
      <Menu hideOnClickOutside={!isMobile} preventBodyScroll={false} {...rest}>
        {(props) => {
          // kind of hacky, but this is an effective way of telling which way
          // the menu will _actually_ be placed when taking into account screen
          // positioning.
          const topAnchor = props.style?.top === "0";
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'placement' does not exist on type 'Extra... Remove this comment to see the full error message
          const rightAnchor = props.placement === "bottom-end";

          return (
            <>
              {isMobile && (
                <Backdrop
                  onClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    rest.hide?.();
                  }}
                />
              )}
              <Position {...props}>
                <Background
                  dir="auto"
                  topAnchor={topAnchor}
                  rightAnchor={rightAnchor}
                  ref={backgroundRef}
                  hiddenScrollbars
                  style={
                    topAnchor && !isMobile
                      ? {
                          maxHeight,
                        }
                      : undefined
                  }
                >
                  {rest.visible || rest.animating ? children : null}
                </Background>
              </Position>
            </>
          );
        }}
      </Menu>
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
  background: ${s("backdrop")};
  z-index: ${depths.menu - 1};
`;

export const Position = styled.div`
  position: absolute;
  z-index: ${depths.menu};

  /*
   * overrides make mobile-first coding style challenging
   * so we explicitly define mobile breakpoint here
   */
  ${breakpoint("mobile", "tablet")`
    position: fixed !important;
    transform: none !important;
    top: auto !important;
    right: 8px !important;
    bottom: 16px !important;
    left: 8px !important;
  `};
`;

type BackgroundProps = {
  topAnchor?: boolean;
  rightAnchor?: boolean;
  theme: DefaultTheme;
};

export const Background = styled(Scrollable)<BackgroundProps>`
  animation: ${mobileContextMenu} 200ms ease;
  transform-origin: 50% 100%;
  max-width: 100%;
  background: ${s("menuBackground")};
  border-radius: 6px;
  padding: 6px;
  min-width: 180px;
  min-height: 44px;
  max-height: 75vh;
  pointer-events: all;
  font-weight: normal;

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    animation: ${(props: BackgroundProps) =>
      props.topAnchor ? fadeAndSlideDown : fadeAndSlideUp} 200ms ease;
    transform-origin: ${(props: BackgroundProps) =>
      props.rightAnchor ? "75%" : "25%"} 0;
    max-width: 276px;
    background: ${(props: BackgroundProps) => props.theme.menuBackground};
    box-shadow: ${(props: BackgroundProps) => props.theme.menuShadow};
  `};
`;
