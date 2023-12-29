import { observer } from "mobx-react";
import * as React from "react";
import { useLocation } from "react-router-dom";
import styled, { css, useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMenuContext from "~/hooks/useMenuContext";
import usePrevious from "~/hooks/usePrevious";
import useStores from "~/hooks/useStores";
import AccountMenu from "~/menus/AccountMenu";
import { fadeOnDesktopBackgrounded } from "~/styles";
import { fadeIn } from "~/styles/animations";
import Desktop from "~/utils/Desktop";
import Avatar from "../Avatar";
import NotificationIcon from "../Notifications/NotificationIcon";
import NotificationsPopover from "../Notifications/NotificationsPopover";
import ResizeBorder from "./components/ResizeBorder";
import SidebarButton, { SidebarButtonProps } from "./components/SidebarButton";
import ToggleButton from "./components/ToggleButton";

const ANIMATION_MS = 250;

type Props = {
  children: React.ReactNode;
  className?: string;
};

const Sidebar = React.forwardRef<HTMLDivElement, Props>(function _Sidebar(
  { children, className }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const [isCollapsing, setCollapsing] = React.useState(false);
  const theme = useTheme();
  const { ui } = useStores();
  const location = useLocation();
  const previousLocation = usePrevious(location);
  const { isMenuOpen } = useMenuContext();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const width = ui.sidebarWidth;
  const collapsed = ui.sidebarIsClosed && !isMenuOpen;
  const maxWidth = theme.sidebarMaxWidth;
  const minWidth = theme.sidebarMinWidth + 16; // padding

  const setWidth = ui.setSidebarWidth;
  const [offset, setOffset] = React.useState(0);
  const [isHovering, setHovering] = React.useState(false);
  const [isAnimating, setAnimating] = React.useState(false);
  const [isResizing, setResizing] = React.useState(false);
  const [hasPointerMoved, setPointerMoved] = React.useState(false);
  const isSmallerThanMinimum = width < minWidth;

  const handleDrag = React.useCallback(
    (event: MouseEvent) => {
      // suppresses text selection
      event.preventDefault();
      // this is simple because the sidebar is always against the left edge
      const width = Math.min(event.pageX - offset, maxWidth);
      const isSmallerThanCollapsePoint = width < minWidth / 2;

      if (isSmallerThanCollapsePoint) {
        setWidth(theme.sidebarCollapsedWidth);
      } else {
        setWidth(width);
      }
    },
    [theme, offset, minWidth, maxWidth, setWidth]
  );

  const handleStopDrag = React.useCallback(() => {
    setResizing(false);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (isSmallerThanMinimum) {
      const isSmallerThanCollapsePoint = width < minWidth / 2;

      if (isSmallerThanCollapsePoint) {
        setAnimating(false);
        setCollapsing(true);
        ui.collapseSidebar();
      } else {
        setWidth(minWidth);
        setAnimating(true);
      }
    } else {
      setWidth(width);
    }
  }, [ui, isSmallerThanMinimum, minWidth, width, setWidth]);

  const handleMouseDown = React.useCallback(
    (event) => {
      setOffset(event.pageX - width);
      setResizing(true);
      setAnimating(false);
    },
    [width]
  );

  const handlePointerMove = React.useCallback(() => {
    if (ui.sidebarIsClosed) {
      setHovering(true);
      setPointerMoved(true);
    }
  }, [ui.sidebarIsClosed]);

  const handlePointerLeave = React.useCallback(
    (ev) => {
      if (hasPointerMoved) {
        setHovering(
          ev.pageX < width &&
            ev.pageX > 0 &&
            ev.pageY < window.innerHeight &&
            ev.pageY > 0
        );
      }
    },
    [width, hasPointerMoved]
  );

  React.useEffect(() => {
    if (ui.sidebarIsClosed) {
      setHovering(false);
      setPointerMoved(false);
    }
  }, [ui.sidebarIsClosed]);

  React.useEffect(() => {
    if (isAnimating) {
      setTimeout(() => setAnimating(false), ANIMATION_MS);
    }
  }, [isAnimating]);

  React.useEffect(() => {
    if (isCollapsing) {
      setTimeout(() => {
        setWidth(minWidth);
        setCollapsing(false);
      }, ANIMATION_MS);
    }
  }, [setWidth, minWidth, isCollapsing]);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", handleStopDrag);
    }

    return () => {
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("mouseup", handleStopDrag);
    };
  }, [isResizing, handleDrag, handleStopDrag]);

  const handleReset = React.useCallback(() => {
    ui.setSidebarWidth(theme.sidebarWidth);
  }, [ui, theme.sidebarWidth]);

  React.useEffect(() => {
    ui.setSidebarResizing(isResizing);
  }, [ui, isResizing]);

  React.useEffect(() => {
    if (location !== previousLocation) {
      ui.hideMobileSidebar();
    }
  }, [ui, location, previousLocation]);

  const style = React.useMemo(
    () => ({
      width: `${width}px`,
    }),
    [width]
  );

  return (
    <>
      <Container
        ref={ref}
        style={style}
        $isHovering={isHovering}
        $isAnimating={isAnimating}
        $isSmallerThanMinimum={isSmallerThanMinimum}
        $mobileSidebarVisible={ui.mobileSidebarVisible}
        $collapsed={collapsed}
        className={className}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        column
      >
        {children}

        {user && (
          <AccountMenu>
            {(props: SidebarButtonProps) => (
              <SidebarButton
                {...props}
                showMoreMenu
                title={user.name}
                position="bottom"
                image={
                  <Avatar
                    alt={user.name}
                    model={user}
                    size={24}
                    showBorder={false}
                    style={{ marginLeft: 4 }}
                  />
                }
              >
                <NotificationsPopover>
                  {(rest: SidebarButtonProps) => (
                    <SidebarButton
                      {...rest}
                      position="bottom"
                      image={<NotificationIcon />}
                    />
                  )}
                </NotificationsPopover>
              </SidebarButton>
            )}
          </AccountMenu>
        )}
        <ResizeBorder
          onMouseDown={handleMouseDown}
          onDoubleClick={ui.sidebarIsClosed ? undefined : handleReset}
        />
      </Container>
      {ui.mobileSidebarVisible && <Backdrop onClick={ui.toggleMobileSidebar} />}
    </>
  );
});

const Backdrop = styled.a`
  animation: ${fadeIn} 250ms ease-in-out;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  cursor: default;
  z-index: ${depths.mobileSidebar - 1};
  background: ${s("backdrop")};
`;

type ContainerProps = {
  $mobileSidebarVisible: boolean;
  $isAnimating: boolean;
  $isSmallerThanMinimum: boolean;
  $isHovering: boolean;
  $collapsed: boolean;
};

const hoverStyles = (props: ContainerProps) => `
  transform: none;
  box-shadow: ${
    props.$collapsed
      ? "rgba(0, 0, 0, 0.2) 1px 0 4px"
      : props.$isSmallerThanMinimum
      ? "rgba(0, 0, 0, 0.1) inset -1px 0 2px"
      : "none"
  };

  ${ToggleButton} {
    opacity: 1;
  }
`;

const Container = styled(Flex)<ContainerProps>`
  position: fixed;
  top: 0;
  bottom: 0;
  width: 100%;
  background: ${s("sidebarBackground")};
  transition: box-shadow 100ms ease-in-out, opacity 100ms ease-in-out,
    transform 100ms ease-out,
    ${s("backgroundTransition")}
      ${(props: ContainerProps) =>
        props.$isAnimating ? `,width ${ANIMATION_MS}ms ease-out` : ""};
  transform: translateX(
    ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")}
  );
  z-index: ${depths.mobileSidebar};
  max-width: 80%;
  min-width: 280px;
  ${fadeOnDesktopBackgrounded()}

  @media print {
    display: none;
    transform: none;
  }

  & > div {
    opacity: ${(props) => (props.$collapsed && !props.$isHovering ? "0" : "1")};
  }

  ${breakpoint("tablet")`
    z-index: ${depths.sidebar};
    margin: 0;
    min-width: 0;
    transform: translateX(${(props: ContainerProps) =>
      props.$collapsed
        ? `calc(-100% + ${Desktop.hasInsetTitlebar() ? 8 : 16}px)`
        : 0});

    ${(props: ContainerProps) => props.$isHovering && css(hoverStyles)}

    &:hover {
      ${ToggleButton} {
        opacity: 1;
      }
    }

    &:focus-within {
      ${hoverStyles}

      & > div {
        opacity: 1;
      }    
    }
  `};
`;

export default observer(Sidebar);
