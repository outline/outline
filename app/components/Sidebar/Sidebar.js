// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import { withRouter } from "react-router-dom";
import type { Location } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Fade from "components/Fade";
import Flex from "components/Flex";
import CollapseToggle, {
  Button as CollapseButton,
} from "./components/CollapseToggle";
import ResizeBorder from "./components/ResizeBorder";
import ResizeHandle from "./components/ResizeHandle";
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
  const { t } = useTranslation();
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
      {ui.mobileSidebarVisible && (
        <Portal>
          <Fade>
            <Background onClick={ui.toggleMobileSidebar} />
          </Fade>
        </Portal>
      )}

      {children}
      {!ui.sidebarCollapsed && (
        <ResizeBorder
          onMouseDown={handleStartDrag}
          onDoubleClick={handleReset}
          $isResizing={isResizing}
        >
          <ResizeHandle name={t("Resize sidebar")} />
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

      & ${CollapseButton} {
        opacity: .75;
      }

      & ${CollapseButton}:hover {
        opacity: 1;
      }
    }

    &:not(:hover):not(:focus-within) > div {
      opacity: ${(props) => (props.$collapsed ? "0" : "1")};
      transition: opacity 100ms ease-in-out;
    }
  `};
`;

export default withRouter(observer(Sidebar));
