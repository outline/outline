// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import { useLocation } from "react-router-dom";
import styled, { useTheme, css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Fade from "components/Fade";
import Flex from "components/Flex";
import ResizeBorder from "./components/ResizeBorder";
import ResizeHandle, { ResizeButton } from "./components/ResizeHandle";
import usePrevious from "hooks/usePrevious";
import useStores from "hooks/useStores";

let firstRender = true;
let ANIMATION_MS = 250;

type Props = {
  children: React.Node,
};

function Sidebar({ children }: Props) {
  const [isCollapsing, setCollapsing] = React.useState(false);
  const theme = useTheme();
  const { t } = useTranslation();
  const { ui } = useStores();
  const location = useLocation();
  const previousLocation = usePrevious(location);

  const width = ui.sidebarWidth;
  const maxWidth = theme.sidebarMaxWidth;
  const minWidth = theme.sidebarMinWidth + 16; // padding
  const collapsed = ui.editMode || ui.sidebarCollapsed;
  const setWidth = ui.setSidebarWidth;

  const [offset, setOffset] = React.useState(0);
  const [startWidth, setStartWidth] = React.useState(width);
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

      if (startWidth - event.pageX === 0) {
        if (ui.sidebarCollapsed) {
          ui.expandSidebar();
        } else {
          setCollapsing(true);
          ui.collapseSidebar();
        }
        return;
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
    [ui, isSmallerThanMinimum, startWidth, minWidth, width, setWidth]
  );

  const handleMouseDown = React.useCallback(
    (event: MouseEvent) => {
      setStartWidth(event.pageX);
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
      left:
        collapsed && !ui.mobileSidebarVisible
          ? `${-width + theme.sidebarCollapsedWidth}px`
          : 0,
    }),
    [width, collapsed, theme.sidebarCollapsedWidth, ui.mobileSidebarVisible]
  );

  const content = (
    <Container
      style={style}
      $sidebarWidth={ui.sidebarWidth}
      $isCollapsing={isCollapsing}
      $isAnimating={isAnimating}
      $isSmallerThanMinimum={isSmallerThanMinimum}
      $mobileSidebarVisible={ui.mobileSidebarVisible}
      $collapsed={collapsed}
      column
    >
      {ui.mobileSidebarVisible && (
        <Portal>
          <Fade>
            <Background onClick={ui.toggleMobileSidebar} />
          </Fade>
        </Portal>
      )}

      {children}

      <ResizeBorder
        onMouseDown={handleMouseDown}
        onDoubleClick={ui.sidebarCollapsed ? undefined : handleReset}
        $isResizing={isResizing}
      >
        <ResizeHandle
          direction={ui.sidebarCollapsed ? "right" : "left"}
          aria-label={t("Resize sidebar")}
        />
      </ResizeBorder>
    </Container>
  );

  // Fade in the sidebar on first render after page load
  if (firstRender) {
    firstRender = false;
    return <Fade>{content}</Fade>;
  }

  return content;
}

const Background = styled.a`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  cursor: default;
  z-index: ${(props) => props.theme.depths.sidebar - 1};
  background: rgba(0, 0, 0, 0.5);
`;

const Container = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  width: 100%;
  background: ${(props) => props.theme.sidebarBackground};
  transition: box-shadow 100ms ease-in-out, margin-left 100ms ease-out,
    ${(props) => props.theme.backgroundTransition}
      ${(props) =>
        props.$isAnimating ? `,width ${ANIMATION_MS}ms ease-out` : ""};
  margin-left: ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")};
  z-index: ${(props) => props.theme.depths.sidebar};
  max-width: 70%;
  min-width: 280px;

  @media print {
    display: none;
    left: 0;
  }

  ${breakpoint("tablet")`
    margin: 0;
    z-index: 3;
    min-width: 0;

    ${(props) =>
      props.$isCollapsing
        ? ""
        : css`
            &:hover,
            &:focus-within {
              left: 0 !important;
              box-shadow: ${(props) =>
                props.$collapsed
                  ? "rgba(0, 0, 0, 0.2) 1px 0 4px"
                  : props.$isSmallerThanMinimum
                  ? "rgba(0, 0, 0, 0.1) inset -1px 0 2px"
                  : "none"};

              ${ResizeButton} {
                opacity: 1;
              }
            }

            &:not(:hover):not(:focus-within) > div {
              opacity: ${(props) => (props.$collapsed ? "0" : "1")};
              transition: opacity 100ms ease-in-out;
            }
          `}
  `};
`;

export default observer(Sidebar);
