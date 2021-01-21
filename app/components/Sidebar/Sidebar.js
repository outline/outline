// @flow
import { observer } from "mobx-react";
import { MenuIcon } from "outline-icons";
import * as React from "react";
import { Portal } from "react-portal";
import { withRouter } from "react-router-dom";
import type { Location } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Fade from "components/Fade";
import Flex from "components/Flex";
import CollapseToggle, { Button } from "./components/CollapseToggle";
import usePrevious from "hooks/usePrevious";
import useStores from "hooks/useStores";

let firstRender = true;
let BOUNCE_ANIMATION_MS = 250;

type Props = {
  children: React.Node,
  location: Location,
};

const useResize = ({ width, minWidth, maxWidth, setWidth }) => {
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
      setWidth(width);
    },
    [offset, maxWidth, setWidth]
  );

  const handleStopDrag = React.useCallback(() => {
    setResizing(false);

    if (isSmallerThanMinimum) {
      setWidth(minWidth);
      setAnimating(true);
    } else {
      setWidth(width);
    }
  }, [isSmallerThanMinimum, minWidth, width, setWidth]);

  const handleStartDrag = React.useCallback(
    (event) => {
      setOffset(event.pageX - width);
      setResizing(true);
      setAnimating(false);
    },
    [width]
  );

  React.useEffect(() => {
    if (isAnimating) {
      setTimeout(() => setAnimating(false), BOUNCE_ANIMATION_MS);
    }
  }, [isAnimating]);

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

  return { isAnimating, isSmallerThanMinimum, isResizing, handleStartDrag };
};

function Sidebar({ location, children }: Props) {
  const theme = useTheme();
  const { ui } = useStores();
  const previousLocation = usePrevious(location);

  const width = ui.sidebarWidth;
  const maxWidth = theme.sidebarMaxWidth;
  const minWidth = theme.sidebarMinWidth + 16; // padding
  const collapsed = ui.editMode || ui.sidebarCollapsed;

  const {
    isAnimating,
    isSmallerThanMinimum,
    isResizing,
    handleStartDrag,
  } = useResize({
    width,
    minWidth,
    maxWidth,
    setWidth: ui.setSidebarWidth,
  });

  const handleReset = React.useCallback(() => {
    ui.setSidebarWidth(theme.sidebarWidth);
  }, [ui, theme.sidebarWidth]);

  React.useEffect(() => {
    if (location !== previousLocation) {
      ui.hideMobileSidebar();
    }
  }, [ui, location, previousLocation]);

  const style = React.useMemo(
    () => ({
      width: `${width}px`,
      left: collapsed ? `${-width + theme.sidebarCollapsedWidth}px` : 0,
    }),
    [width, collapsed, theme.sidebarCollapsedWidth]
  );

  const content = (
    <Container
      style={style}
      $sidebarWidth={ui.sidebarWidth}
      $isAnimating={isAnimating}
      $isSmallerThanMinimum={isSmallerThanMinimum}
      $mobileSidebarVisible={ui.mobileSidebarVisible}
      $collapsed={collapsed}
      column
    >
      {!isResizing && (
        <CollapseToggle
          collapsed={ui.sidebarCollapsed}
          onClick={ui.toggleCollapsedSidebar}
        />
      )}
      {ui.mobileSidebarVisible ? (
        <Portal>
          <Fade>
            <Background onClick={ui.toggleMobileSidebar} />
          </Fade>
        </Portal>
      ) : (
        <Toggle onClick={ui.toggleMobileSidebar}>
          <MenuIcon size={32} />
        </Toggle>
      )}

      {children}
      {!ui.sidebarCollapsed && (
        <ResizeBorder
          onMouseDown={handleStartDrag}
          onDoubleClick={handleReset}
          $isResizing={isResizing}
        >
          <ResizeHandle />
        </ResizeBorder>
      )}
    </Container>
  );

  // Fade in the sidebar on first render after page load
  if (firstRender) {
    firstRender = false;
    return <Fade>{content}</Fade>;
  }

  return content;
}

const ResizeHandle = styled.button`
  opacity: 0;
  transition: opacity 100ms ease-in-out;
  transform: translateY(-50%);
  position: absolute;
  top: 50%;
  height: 40px;
  right: -10px;
  width: 8px;
  padding: 0;
  border: 0;
  background: ${(props) => props.theme.sidebarBackground};
  border-radius: 8px;
  pointer-events: none;

  &:after {
    content: "";
    position: absolute;
    top: -24px;
    bottom: -24px;
    left: -12px;
    right: -12px;
  }

  &:active {
    background: ${(props) => props.theme.sidebarText};
  }

  ${breakpoint("tablet")`
    pointer-events: all;
    cursor: ew-resize;
  `}
`;

const ResizeBorder = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  right: -6px;
  width: 12px;
  cursor: ew-resize;

  ${(props) =>
    props.$isResizing &&
    `
  ${ResizeHandle} {
    opacity: 1;
  }
  `}

  &:hover {
    ${ResizeHandle} {
      opacity: 1;
    }
  }
`;

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
  transition: box-shadow, 100ms, ease-in-out, margin-left 100ms ease-out,
    left 100ms ease-out,
    ${(props) => props.theme.backgroundTransition}
      ${(props) =>
        props.$isAnimating ? `,width ${BOUNCE_ANIMATION_MS}ms ease-out` : ""};
  margin-left: ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")};
  z-index: ${(props) => props.theme.depths.sidebar};
  max-width: 70%;
  min-width: 280px;

  @media print {
    display: none;
    left: 0;
  }

  &:before,
  &:after {
    content: "";
    background: ${(props) => props.theme.sidebarBackground};
    position: absolute;
    top: -50vh;
    left: 0;
    width: 100%;
    height: 50vh;
  }

  &:after {
    top: auto;
    bottom: -50vh;
  }

  ${breakpoint("tablet")`
    margin: 0;
    z-index: 3;
    min-width: 0;

    &:hover,
    &:focus-within {
      left: 0 !important;
      box-shadow: ${(props) =>
        props.$collapsed
          ? "rgba(0, 0, 0, 0.2) 1px 0 4px"
          : props.$isSmallerThanMinimum
          ? "rgba(0, 0, 0, 0.1) inset -1px 0 2px"
          : "none"};

      & ${Button} {
        opacity: .75;
      }

      & ${Button}:hover {
        opacity: 1;
      }
    }

    &:not(:hover):not(:focus-within) > div {
      opacity: ${(props) => (props.$collapsed ? "0" : "1")};
      transition: opacity 100ms ease-in-out;
    }
  `};
`;

const Toggle = styled.a`
  display: flex;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  margin: 12px;

  ${breakpoint("tablet")`
    display: none;
  `};
`;

export default withRouter(observer(Sidebar));
