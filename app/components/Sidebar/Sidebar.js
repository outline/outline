// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import { useLocation } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { fadeIn } from "shared/styles/animations";
import Fade from "components/Fade";
import Flex from "components/Flex";
import ResizeBorder from "./components/ResizeBorder";
import Toggle, { ToggleButton, Positioner } from "./components/Toggle";
import usePrevious from "hooks/usePrevious";
import useStores from "hooks/useStores";

let ANIMATION_MS = 250;
let isFirstRender = true;

type Props = {|
  children: React.Node,
|};

const Sidebar = React.forwardRef<Props, HTMLButtonElement>(
  ({ children }: Props, ref) => {
    const [isCollapsing, setCollapsing] = React.useState(false);
    const theme = useTheme();
    const { t } = useTranslation();
    const { ui } = useStores();
    const location = useLocation();
    const previousLocation = usePrevious(location);

    const width = ui.sidebarWidth;
    const collapsed = ui.isEditing || ui.sidebarCollapsed;
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

    const handleStopDrag = React.useCallback(
      (event: MouseEvent) => {
        setResizing(false);

        if (document.activeElement) {
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
      },
      [ui, isSmallerThanMinimum, minWidth, width, setWidth]
    );

    const handleMouseDown = React.useCallback(
      (event: MouseEvent) => {
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
        isFirstRender = false;
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

    const content = (
      <>
        {ui.mobileSidebarVisible && (
          <Portal>
            <Backdrop onClick={ui.toggleMobileSidebar} />
          </Portal>
        )}
        {children}
        <ResizeBorder
          onMouseDown={handleMouseDown}
          onDoubleClick={ui.sidebarCollapsed ? undefined : handleReset}
          $isResizing={isResizing}
        />
        {ui.sidebarCollapsed && !ui.isEditing && (
          <Toggle
            onClick={ui.toggleCollapsedSidebar}
            direction={"right"}
            aria-label={t("Expand")}
          />
        )}
      </>
    );

    return (
      <>
        <Container
          ref={ref}
          style={style}
          $sidebarWidth={ui.sidebarWidth}
          $isCollapsing={isCollapsing}
          $isAnimating={isAnimating}
          $isSmallerThanMinimum={isSmallerThanMinimum}
          $mobileSidebarVisible={ui.mobileSidebarVisible}
          $collapsed={collapsed}
          column
        >
          {isFirstRender ? <Fade>{content}</Fade> : content}
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

const Backdrop = styled.a`
  animation: ${fadeIn} 250ms ease-in-out;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  cursor: default;
  z-index: ${(props) => props.theme.depths.sidebar - 1};
  background: ${(props) => props.theme.backdrop};
`;

const Container = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  width: 100%;
  background: ${(props) => props.theme.sidebarBackground};
  transition: box-shadow 100ms ease-in-out, transform 100ms ease-out,
    ${(props) => props.theme.backgroundTransition}
      ${(props) =>
        props.$isAnimating ? `,width ${ANIMATION_MS}ms ease-out` : ""};
  transform: translateX(
    ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")}
  );
  z-index: ${(props) => props.theme.depths.sidebar};
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
    transform: translateX(${(props) =>
      props.$collapsed ? "calc(-100% + 16px)" : 0});

    &:hover,
    &:focus-within {
      transform: none;
      box-shadow: ${(props) =>
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
      opacity: ${(props) => (props.$collapsed ? "0" : "1")};
      transition: opacity 100ms ease-in-out;
    }
  `};
`;

export default observer(Sidebar);
