import { observer } from "mobx-react";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { useHistory } from "react-router-dom";
import styled, { ThemeProvider, useTheme } from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import { depths, s } from "@shared/styles";
import { Avatar } from "~/components/Avatar";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import useEventListener from "~/hooks/useEventListener";
import useMobile from "~/hooks/useMobile";
import { useResizeHandle } from "~/hooks/useResizeHandle";
import useStores from "~/hooks/useStores";
import { useSwipeToDismiss } from "~/hooks/useSwipeToDismiss";
import AccountMenu from "~/menus/AccountMenu";
import { fadeOnDesktopBackgrounded } from "~/styles";
import { drawerTransition } from "~/styles/animations";
import Desktop from "~/utils/Desktop";
import NotificationIcon from "../Notifications/NotificationIcon";
import NotificationsPopover from "../Notifications/NotificationsPopover";
import { TooltipProvider } from "../TooltipContext";
import ResizeBorder from "./components/ResizeBorder";
import SidebarButton from "./components/SidebarButton";
import ToggleButton from "./components/ToggleButton";
import { useTranslation } from "react-i18next";
import { useDirection } from "@radix-ui/react-direction";

const ANIMATION_MS = 250;

type Props = {
  /** Whether to hide the sidebar content (sets opacity to 0). */
  hidden?: boolean;
  /** Whether the sidebar can be collapsed, defaults to true. */
  canCollapse?: boolean;
  /** Whether to show the account menu for the signed-in user, defaults to true. */
  showAccountMenu?: boolean;
  /** CSS class name(s) to apply to the sidebar container. */
  className?: string;
  /** Content to render inside the sidebar. */
  children: React.ReactNode;
  /** Ref to the sidebar container. */
  ref?: React.Ref<HTMLDivElement>;
};

function Sidebar({
  children,
  hidden = false,
  canCollapse = true,
  showAccountMenu = true,
  className,
  ref,
}: Props) {
  const [isCollapsing, setCollapsing] = React.useState(false);
  const { t } = useTranslation();
  const theme = useTheme();
  const { ui } = useStores();
  const history = useHistory();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const isMobile = useMobile();
  const width = ui.sidebarWidth;
  const sidebarIsClosed = ui.sidebarIsClosed;
  const collapsed = sidebarIsClosed && canCollapse;
  const maxWidth = theme.sidebarMaxWidth;
  const minWidth = theme.sidebarResizeMinWidth;
  const direction = useDirection();

  const [offset, setOffset] = React.useState(0);
  const [isHovering, setHovering] = React.useState(false);
  const [isAnimating, setAnimating] = React.useState(false);
  const [hasPointerMoved, setPointerMoved] = React.useState(false);
  const isSmallerThanMinimum = width < minWidth;
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const internalRef = React.useRef<HTMLDivElement | null>(null);
  const backdropRef = React.useRef<HTMLAnchorElement | null>(null);
  const mergedRef = React.useMemo(() => mergeRefs([internalRef, ref]), [ref]);

  const measure = React.useCallback(
    (event: MouseEvent) =>
      direction === "rtl" ? offset - event.pageX : event.pageX - offset,
    [offset, direction]
  );

  const handleResize = React.useCallback(
    (newWidth: number) => {
      const isSmallerThanCollapsePoint = newWidth < minWidth / 2;

      if (canCollapse) {
        ui.set({
          sidebarWidth: isSmallerThanCollapsePoint
            ? theme.sidebarCollapsedWidth
            : newWidth,
        });
      } else {
        ui.set({ sidebarWidth: Math.max(newWidth, minWidth) });
      }
    },
    [ui, theme, minWidth, canCollapse]
  );

  const handleResizeEnd = React.useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (isSmallerThanMinimum) {
      const isSmallerThanCollapsePoint = width < minWidth / 2;

      if (isSmallerThanCollapsePoint && canCollapse) {
        setAnimating(false);
        setCollapsing(true);
        ui.collapseSidebar();
      } else {
        ui.set({ sidebarWidth: minWidth });
        setAnimating(true);
      }
    } else if (width > maxWidth) {
      ui.set({ sidebarWidth: maxWidth });
      setAnimating(true);
    }
  }, [ui, isSmallerThanMinimum, minWidth, maxWidth, width, canCollapse]);

  // The lower bound is the collapse gesture rather than a stop, so only the maximum is stretchable.
  const { isResizing, startResize } = useResizeHandle({
    measure,
    onResize: handleResize,
    onResizeEnd: handleResizeEnd,
    max: maxWidth,
  });

  const handleBlur = React.useCallback(() => {
    setHovering(false);
  }, []);

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!document.hasFocus()) {
        return;
      }

      setOffset(
        direction === "rtl" ? event.pageX + width : event.pageX - width
      );
      setAnimating(false);
      startResize(event);
    },
    [width, direction, startResize]
  );

  const handlePointerActivity = React.useCallback(
    (event: React.PointerEvent) => {
      if (sidebarIsClosed) {
        // don't reveal while a button is held, e.g. selecting text near the edge
        if (event.buttons !== 0) {
          return;
        }
        // clear the timeout when mouse exits
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        setHovering(document.hasFocus());
        setPointerMoved(true);
      }
    },
    [sidebarIsClosed]
  );

  const handlePointerLeave = React.useCallback(
    (ev: React.PointerEvent) => {
      if (hasPointerMoved) {
        // clear any previous timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }

        // add a short delay when mouse exits the sidebar before closing
        hoverTimeoutRef.current = setTimeout(() => {
          const withinSidebar =
            direction === "rtl"
              ? ev.pageX > window.innerWidth - width
              : ev.pageX < width;

          setHovering(
            document.hasFocus() &&
              withinSidebar &&
              ev.pageY < window.innerHeight &&
              ev.pageY > 0
          );
        }, 500);
      }
    },
    [width, direction, hasPointerMoved]
  );

  React.useEffect(() => {
    if (sidebarIsClosed) {
      setHovering(false);
      setPointerMoved(false);
    }
  }, [sidebarIsClosed]);

  // Reset stale hover state when the sidebar becomes visible after being
  // hidden via display:none (e.g. returning from settings). Without this, a
  // pointer-leave event never fires when navigating away while hovering, so
  // isHovering stays true and the sidebar appears expanded until the cursor
  // re-enters and leaves.
  React.useEffect(() => {
    const el = internalRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      return;
    }
    let wasVisible = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const nowVisible = entry.isIntersecting;
        if (nowVisible && !wasVisible) {
          setHovering(false);
          setPointerMoved(false);
        }
        wasVisible = nowVisible;
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  useEventListener("blur", handleBlur);

  const handleReset = React.useCallback(() => {
    ui.set({ sidebarWidth: theme.sidebarWidth });
  }, [ui, theme.sidebarWidth]);

  React.useEffect(() => {
    ui.setSidebarResizing(isResizing);
  }, [ui, isResizing]);

  // Subscribe to history rather than the location, so that the sidebar does
  // not re-render on every navigation.
  React.useEffect(
    () =>
      history.listen(() => {
        ui.hideMobileSidebar();
      }),
    [ui, history]
  );

  // On mobile the width comes from the viewport, not the resizable desktop width.
  const style = React.useMemo(
    () => (isMobile ? undefined : { width: `${width}px` }),
    [isMobile, width]
  );

  // On mobile the sidebar is a drawer, so it uses the drawer colors.
  const sidebarTheme = React.useMemo(
    () =>
      isMobile
        ? {
            ...theme,
            sidebarBackground: theme.menuBackground,
            sidebarHoverBackground: theme.menuItemSelected,
            sidebarActiveBackground: theme.menuItemSelected,
          }
        : theme,
    [isMobile, theme]
  );

  useSwipeToDismiss(internalRef, backdropRef, {
    enabled: isMobile && ui.mobileSidebarVisible,
    side: direction === "rtl" ? "right" : "left",
    onDismiss: ui.hideMobileSidebar,
  });

  return (
    <ThemeProvider theme={sidebarTheme}>
      <TooltipProvider>
        <Container
          id="sidebar"
          ref={mergedRef}
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

          {user && showAccountMenu && (
            <AccountMenu>
              <SidebarButton
                showMoreMenu
                title={user.name}
                position="bottom"
                image={
                  <Avatar
                    alt={t("Avatar of {{ name }}", { name: user.name })}
                    model={user}
                    size={24}
                    showHoverCard={false}
                  />
                }
              >
                <NotificationsPopover>
                  <SidebarButton
                    position="bottom"
                    image={<NotificationIcon />}
                    aria-label={t("Notifications")}
                    style={{ paddingInline: 4 }}
                  />
                </NotificationsPopover>
              </SidebarButton>
            </AccountMenu>
          )}
          {!isMobile && (
            <ResizeBorder
              onMouseDown={handleMouseDown}
              onDoubleClick={sidebarIsClosed ? undefined : handleReset}
            />
          )}
        </Container>
        <Backdrop
          ref={backdropRef}
          $visible={ui.mobileSidebarVisible}
          onClick={ui.hideMobileSidebar}
          aria-hidden
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}

const Backdrop = styled.a<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  cursor: default;
  z-index: ${depths.mobileSidebar - 1};
  background: ${s("backdrop")};
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
  transition: opacity ${drawerTransition};

  ${breakpoint("tablet")`
    display: none;
  `};
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
  transform: none !important;
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
  inset-inline-start: 0;
  width: 100%;
  background: ${s("sidebarBackground")};
  transition:
    box-shadow 150ms ease-in-out,
    transform ${drawerTransition}
      ${(props: ContainerProps) =>
        props.$isAnimating ? `, width ${ANIMATION_MS}ms ease-out` : ""};
  transform: translateX(
    ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")}
  );
  z-index: ${depths.mobileSidebar};
  max-width: 80%;
  min-width: 280px;
  padding-inline-start: var(--sal);
  padding-bottom: var(--sab, 0px);
  ${fadeOnDesktopBackgrounded()}

  ${breakpoint("mobile", "tablet")`
    /* Leaves a strip of the page visible to tap and close, as in Material navigation drawers. */
    width: calc(100% - 56px);
    max-width: 360px;
    min-width: 0;
    border-start-end-radius: 8px;
    border-end-end-radius: 8px;
    /* The negative spread keeps the shadow off the edge side, so a stretch cannot reveal it. */
    box-shadow: ${(props: ContainerProps) =>
      props.$mobileSidebarVisible
        ? "12px 0 24px -12px rgb(0 0 0 / 16%)"
        : "none"};

    [dir="rtl"] & {
      box-shadow: ${(props: ContainerProps) =>
        props.$mobileSidebarVisible
          ? "-12px 0 24px -12px rgb(0 0 0 / 16%)"
          : "none"};
    }

    @supports (corner-shape: superellipse(2)) {
      border-start-end-radius: 14px;
      border-end-end-radius: 14px;
      corner-shape: superellipse(2);
    }

    /* Fills the space behind the edge when the sidebar is stretched past open,
       overlapping by a pixel so no seam shows at fractional offsets. */
    &::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      inset-inline-end: calc(100% - 1px);
      width: 100%;
      background: inherit;
    }

    /* Horizontal gestures drag the sidebar closed, scroll containers inside reset the value. */
    &,
    & * {
      touch-action: pan-y pinch-zoom;
    }
  `};

  [dir="rtl"] & {
    transform: translateX(
      ${(props) => (props.$mobileSidebarVisible ? 0 : "100%")}
    );
  }

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
    transition:
      box-shadow 150ms ease-in-out,
      transform 150ms ease-out${(props: ContainerProps) =>
        props.$isAnimating ? `, width ${ANIMATION_MS}ms ease-out` : ""};
    transform: translateX(${(props: ContainerProps) =>
      props.$collapsed
        ? `calc(-100% + ${Desktop.hasInsetTitlebar() ? 8 : 16}px)`
        : 0});

    [dir="rtl"] & {
      transform: translateX(${(props: ContainerProps) =>
        props.$collapsed ? `calc(100% - 8px)` : 0});
    }

    ${(props: ContainerProps) => props.$isHovering && hoverStyles(props)}

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
