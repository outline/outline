import { observer } from "mobx-react";
import * as React from "react";
import { useLocation } from "react-router-dom";
import styled, { css, useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import { Avatar } from "~/components/Avatar";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMenuContext from "~/hooks/useMenuContext";
import useMobile from "~/hooks/useMobile";
import usePrevious from "~/hooks/usePrevious";
import useStores from "~/hooks/useStores";
import AccountMenu from "~/menus/AccountMenu";
import { fadeOnDesktopBackgrounded } from "~/styles";
import { fadeIn } from "~/styles/animations";
import Desktop from "~/utils/Desktop";
import NotificationIcon from "../Notifications/NotificationIcon";
import NotificationsPopover from "../Notifications/NotificationsPopover";
import { TooltipProvider } from "../TooltipContext";
import ResizeBorder from "./components/ResizeBorder";
import SidebarButton, { SidebarButtonProps } from "./components/SidebarButton";
import ToggleButton from "./components/ToggleButton";

const ANIMATION_MS = 250;

type Props = {
  children: React.ReactNode;
  hidden?: boolean;
  className?: string;
};

const Sidebar = React.forwardRef<HTMLDivElement, Props>(function _Sidebar(
  { children, hidden = false, className }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const [isCollapsing, setCollapsing] = React.useState(false);
  const theme = useTheme();
  const { ui } = useStores();
  const location = useLocation();
  const previousLocation = usePrevious(location);
  const { isMenuOpen } = useMenuContext();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const isMobile = useMobile();
  const width = ui.sidebarWidth;
  const collapsed = ui.sidebarIsClosed && !isMenuOpen;
  const maxWidth = theme.sidebarMaxWidth;
  const minWidth = theme.sidebarMinWidth + 16; // padding

  const [offset, setOffset] = React.useState(0);
  const [isHovering, setHovering] = React.useState(false);
  const [isAnimating, setAnimating] = React.useState(false);
  const [isResizing, setResizing] = React.useState(false);
  const [hasPointerMoved, setPointerMoved] = React.useState(false);
  const isSmallerThanMinimum = width < minWidth;

  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleDrag = React.useCallback(
    (event: MouseEvent) => {
      // suppresses text selection
      event.preventDefault();
      // this is simple because the sidebar is always against the left edge
      const width = Math.min(event.pageX - offset, maxWidth);
      const isSmallerThanCollapsePoint = width < minWidth / 2;

      ui.set({
        sidebarWidth: isSmallerThanCollapsePoint
          ? theme.sidebarCollapsedWidth
          : width,
      });
    },
    [ui, theme, offset, minWidth, maxWidth]
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
        ui.set({ sidebarWidth: minWidth });
        setAnimating(true);
      }
    } else {
      ui.set({ sidebarWidth: width });
    }
  }, [ui, isSmallerThanMinimum, minWidth, width]);

  const handleBlur = React.useCallback(() => {
    setHovering(false);
  }, []);

  const handleMouseDown = React.useCallback(
    (event) => {
      event.preventDefault();
      if (!document.hasFocus()) {
        return;
      }

      setOffset(event.pageX - width);
      setResizing(true);
      setAnimating(false);
    },
    [width]
  );

  const handlePointerActivity = React.useCallback(() => {
    if (ui.sidebarIsClosed) {
      // clear the timeout when mouse exits
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setHovering(document.hasFocus());
      setPointerMoved(true);
    }
  }, [ui.sidebarIsClosed]);

  const handlePointerLeave = React.useCallback(
    (ev) => {
      if (hasPointerMoved) {
        // clear any previous timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }

        // add a short delay when mouse exits the sidebar before closing
        hoverTimeoutRef.current = setTimeout(() => {
          setHovering(
            document.hasFocus() &&
              ev.pageX < width &&
              ev.pageY < window.innerHeight &&
              ev.pageY > 0
          );
        }, 500);
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
        ui.set({ sidebarWidth: minWidth });
        setCollapsing(false);
      }, ANIMATION_MS);
    }
  }, [ui, minWidth, isCollapsing]);

  React.useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", handleStopDrag);
    } else {
      document.body.style.cursor = "initial";
    }

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("mouseup", handleStopDrag);
    };
  }, [isResizing, handleDrag, handleBlur, handleStopDrag]);

  const handleReset = React.useCallback(() => {
    ui.set({ sidebarWidth: theme.sidebarWidth });
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
    <TooltipProvider>
      <Container
        id="sidebar"
        ref={ref}
        style={style}
        $hidden={hidden}
        $isHovering={isHovering}
        $isAnimating={isAnimating}
        $isSmallerThanMinimum={isSmallerThanMinimum}
        $mobileSidebarVisible={ui.mobileSidebarVisible}
        $collapsed={collapsed}
        $isMobile={isMobile}
        className={className}
        onPointerDown={handlePointerActivity}
        onPointerMove={handlePointerActivity}
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
                    style={{ marginLeft: 4 }}
                  />
                }
              >
                <Notifications />
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
    </TooltipProvider>
  );
});

const Notifications = () => (
  <NotificationsPopover>
    {(rest: SidebarButtonProps) => (
      <SidebarButton {...rest} position="bottom" image={<NotificationIcon />} />
    )}
  </NotificationsPopover>
);

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
  $hidden: boolean;
  $isMobile: boolean;
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
  transition: box-shadow 150ms ease-in-out, transform 150ms ease-out,
    ${(props: ContainerProps) =>
      props.$isAnimating ? `,width ${ANIMATION_MS}ms ease-out` : ""};
  transform: translateX(
    ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")}
  );
  z-index: ${depths.mobileSidebar};
  max-width: 80%;
  min-width: 280px;
  padding-left: var(--sal);
  ${fadeOnDesktopBackgrounded()}

  @media print {
    display: none;
    transform: none;
  }

  & > div {
    transition: opacity 150ms ease-in-out;
    opacity: ${(props) => {
      if (props.$hidden) {
        return "0";
      }
      if (props.$isHovering) {
        return "1";
      }
      if (props.$isMobile) {
        return props.$mobileSidebarVisible ? "1" : "0";
      } else {
        return props.$collapsed ? "0" : "1";
      }
    }};
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
