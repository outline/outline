// @flow
import { observer } from "mobx-react";
import { CloseIcon, MenuIcon } from "outline-icons";
import * as React from "react";
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

type Props = {
  children: React.Node,
  location: Location,
};

function Sidebar({ location, children }: Props) {
  const theme = useTheme();
  const { ui } = useStores();
  const previousLocation = usePrevious(location);
  const [isAnimating, setAnimating] = React.useState(false);
  const [isResizing, setResizing] = React.useState(false);
  const [width, setWidth] = React.useState(undefined);

  const minWidth = parseInt(theme.sidebarMinWidth) + 16; // padding
  const isSmallerThanMinimum = width !== undefined && width < minWidth;

  const handleDrag = React.useCallback((event: MouseEvent) => {
    // suppresses text selection
    event.preventDefault();

    // this is simple because the sidebar is always against the left edge
    setWidth(Math.min(event.pageX, 400));
  }, []);

  const handleStopDrag = React.useCallback(() => {
    setResizing(false);

    if (isSmallerThanMinimum) {
      setWidth(minWidth);
      setAnimating(true);
    }
  }, [isSmallerThanMinimum, minWidth]);

  const handleStartDrag = React.useCallback(() => {
    setResizing(true);
    setAnimating(false);
  }, []);

  React.useEffect(() => {
    if (isAnimating && (ui.sidebarCollapsed || ui.editMode)) {
      setAnimating(false);
    }
  }, [isAnimating, ui.sidebarCollapsed, ui.editMode]);

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

  React.useEffect(() => {
    if (location !== previousLocation) {
      ui.hideMobileSidebar();
    }
  }, [ui, location, previousLocation]);

  const content = (
    <Container
      style={width ? { width: `${width}px` } : undefined}
      $isAnimating={isAnimating}
      $isSmallerThanMinimum={isSmallerThanMinimum}
      mobileSidebarVisible={ui.mobileSidebarVisible}
      collapsed={ui.editMode || ui.sidebarCollapsed}
      column
    >
      {!isResizing && (
        <>
          <CollapseToggle
            collapsed={ui.sidebarCollapsed}
            onClick={ui.toggleCollapsedSidebar}
          />
          <Toggle
            onClick={ui.toggleMobileSidebar}
            mobileSidebarVisible={ui.mobileSidebarVisible}
          >
            {ui.mobileSidebarVisible ? (
              <CloseIcon size={32} />
            ) : (
              <MenuIcon size={32} />
            )}
          </Toggle>
        </>
      )}
      {children}
      <ResizeHandle onMouseDown={handleStartDrag} $isResizing={isResizing} />
    </Container>
  );

  // Fade in the sidebar on first render after page load
  if (firstRender) {
    firstRender = false;
    return <Fade>{content}</Fade>;
  }

  return content;
}

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 3px;
  cursor: ew-resize;
`;

const Container = styled(Flex)`
  overflow: hidden;
  position: fixed;
  top: 0;
  bottom: 0;
  width: 100%;
  background: ${(props) => props.theme.sidebarBackground};
  transition: box-shadow, 100ms, ease-in-out, left 100ms ease-out,
    ${(props) => props.theme.backgroundTransition},
    ${(props) => (props.$isAnimating ? "width 250ms ease-out" : "")};
  margin-left: ${(props) => (props.mobileSidebarVisible ? 0 : "-100%")};
  z-index: ${(props) => props.theme.depths.sidebar};

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
    left: ${(props) =>
      props.collapsed
        ? `calc(-${props.theme.sidebarWidth} + ${props.theme.sidebarCollapsedWidth})`
        : 0};
    width: ${(props) => props.theme.sidebarWidth};
    margin: 0;
    z-index: 3;

    box-shadow: ${(props) =>
      props.$isSmallerThanMinimum
        ? "rgba(0, 0, 0, 0.1) inset -1px 0 2px"
        : "none"};

    &:hover,
    &:focus-within {
      left: 0;
      box-shadow: ${(props) =>
        props.collapsed ? "rgba(0, 0, 0, 0.2) 1px 0 4px" : "none"};

      & ${Button} {
        opacity: .75;
      }

      & ${Button}:hover {
        opacity: 1;
      }
    }

    &:not(:hover):not(:focus-within) > div {
      opacity: ${(props) => (props.collapsed ? "0" : "1")};
      transition: opacity 100ms ease-in-out;
    }
  `};
`;

const Toggle = styled.a`
  display: flex;
  align-items: center;
  position: fixed;
  top: 0;
  left: ${(props) => (props.mobileSidebarVisible ? "auto" : 0)};
  right: ${(props) => (props.mobileSidebarVisible ? 0 : "auto")};
  z-index: 1;
  margin: 12px;

  ${breakpoint("tablet")`
    display: none;
  `};
`;

export default withRouter(observer(Sidebar));
