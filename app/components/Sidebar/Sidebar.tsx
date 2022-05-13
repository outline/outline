import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import { useLocation } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths } from "@shared/styles";
import Flex from "~/components/Flex";
import useMenuContext from "~/hooks/useMenuContext";
import usePrevious from "~/hooks/usePrevious";
import useStores from "~/hooks/useStores";
import AccountMenu from "~/menus/AccountMenu";
import { fadeIn } from "~/styles/animations";
import Avatar from "../Avatar";
import ResizeBorder from "./components/ResizeBorder";
import SidebarButton, { SidebarButtonProps } from "./components/SidebarButton";
import Toggle, { ToggleButton, Positioner } from "./components/Toggle";

const ANIMATION_MS = 250;

type Props = {
  children: React.ReactNode;
};

const Sidebar = React.forwardRef<HTMLDivElement, Props>(
  ({ children }: Props, ref: React.RefObject<HTMLDivElement>) => {
    const [isCollapsing, setCollapsing] = React.useState(false);
    const theme = useTheme();
    const { t } = useTranslation();
    const { ui, auth } = useStores();
    const location = useLocation();
    const previousLocation = usePrevious(location);
    const { isMenuOpen } = useMenuContext();
    const { user } = auth;

    const width = ui.sidebarWidth;
    const collapsed = (ui.isEditing || ui.sidebarCollapsed) && !isMenuOpen;
    const maxWidth = theme.sidebarMaxWidth;
    const minWidth = theme.sidebarMinWidth + 16; // padding

    const setWidth = ui.setSidebarWidth;
    const [offset, setOffset] = React.useState(0);
    const [isAnimating, setAnimating] = React.useState(false);
    const [isResizing, setResizing] = React.useState(false);
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

    const toggleStyle = React.useMemo(
      () => ({
        right: "auto",
        marginLeft: `${collapsed ? theme.sidebarCollapsedWidth : width}px`,
      }),
      [width, theme.sidebarCollapsedWidth, collapsed]
    );

    return (
      <>
        <Container
          ref={ref}
          style={style}
          $isAnimating={isAnimating}
          $isSmallerThanMinimum={isSmallerThanMinimum}
          $mobileSidebarVisible={ui.mobileSidebarVisible}
          $collapsed={collapsed}
          column
        >
          {ui.mobileSidebarVisible && (
            <Portal>
              <Backdrop onClick={ui.toggleMobileSidebar} />
            </Portal>
          )}
          {children}

          {user && (
            <AccountMenu>
              {(props: SidebarButtonProps) => (
                <SidebarButton
                  {...props}
                  showMoreMenu
                  title={user.name}
                  image={
                    <StyledAvatar
                      alt={user.name}
                      src={user.avatarUrl}
                      size={24}
                      showBorder={false}
                    />
                  }
                />
              )}
            </AccountMenu>
          )}
          <ResizeBorder
            onMouseDown={handleMouseDown}
            onDoubleClick={ui.sidebarCollapsed ? undefined : handleReset}
          />
          {ui.sidebarCollapsed && !ui.isEditing && (
            <Toggle
              onClick={ui.toggleCollapsedSidebar}
              direction={"right"}
              aria-label={t("Expand")}
            />
          )}
        </Container>
        {!ui.isEditing && (
          <Toggle
            style={toggleStyle}
            onClick={ui.toggleCollapsedSidebar}
            direction={ui.sidebarCollapsed ? "right" : "left"}
            aria-label={ui.sidebarCollapsed ? t("Expand") : t("Collapse")}
          />
        )}
      </>
    );
  }
);

const StyledAvatar = styled(Avatar)`
  margin-left: 4px;
`;

const Backdrop = styled.a`
  animation: ${fadeIn} 250ms ease-in-out;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  cursor: default;
  z-index: ${depths.sidebar - 1};
  background: ${(props) => props.theme.backdrop};
`;

type ContainerProps = {
  $mobileSidebarVisible: boolean;
  $isAnimating: boolean;
  $isSmallerThanMinimum: boolean;
  $collapsed: boolean;
};

const Container = styled(Flex)<ContainerProps>`
  position: fixed;
  top: 0;
  bottom: 0;
  width: 100%;
  background: ${(props) => props.theme.sidebarBackground};
  transition: box-shadow 100ms ease-in-out, transform 100ms ease-out,
    ${(props) => props.theme.backgroundTransition}
      ${(props: ContainerProps) =>
        props.$isAnimating ? `,width ${ANIMATION_MS}ms ease-out` : ""};
  transform: translateX(
    ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")}
  );
  z-index: ${depths.sidebar};
  max-width: 70%;
  min-width: 280px;

  ${Positioner} {
    display: none;
  }

  @media print {
    display: none;
    transform: none;
  }

  ${breakpoint("tablet")`
    margin: 0;
    min-width: 0;
    transform: translateX(${(props: ContainerProps) =>
      props.$collapsed ? "calc(-100% + 16px)" : 0});

    &:hover,
    &:focus-within {
      transform: none;
      box-shadow: ${(props: ContainerProps) =>
        props.$collapsed
          ? "rgba(0, 0, 0, 0.2) 1px 0 4px"
          : props.$isSmallerThanMinimum
          ? "rgba(0, 0, 0, 0.1) inset -1px 0 2px"
          : "none"};

      ${Positioner} {
        display: block;
      }

      ${ToggleButton} {
        opacity: 1;
      }
    }

    &:not(:hover):not(:focus-within) > div {
      opacity: ${(props: ContainerProps) => (props.$collapsed ? "0" : "1")};
      transition: opacity 100ms ease-in-out;
    }
  `};
`;

export default observer(Sidebar);
