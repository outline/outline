import type { LocationDescriptor, LocationState, MemoryHistory } from "history";
import { createMemoryHistory, createPath } from "history";
import { useDirection } from "@radix-ui/react-direction";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Router, useLocation } from "react-router-dom";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import CenteredContent from "~/components/CenteredContent";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import {
  RightSidebarProvider,
  useRightSidebarContent,
} from "~/components/RightSidebarContext";
import ResizeBorder from "~/components/Sidebar/components/ResizeBorder";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import history, { patchLocation, toLocationDescriptor } from "~/utils/history";
import type { SplitViewPane } from "~/utils/splitView";
import {
  getFocusedSplitPane,
  getSplitPath,
  isSplitablePath,
  setFocusedSplitPane,
  setSplitPath,
} from "~/utils/splitView";
import { SplitViewContext } from "./context";

type Props = {
  /** The routes to render, once per open pane. */
  children: React.ReactNode;
};

/**
 * Renders the application routes in a single pane, or side by side in two
 * panes when a secondary route is present in the split query parameter. The
 * secondary pane is driven by its own in-memory router which is kept in sync
 * with the query parameter so that a reload hydrates both panes.
 */
export const SplitView = observer(function SplitView({ children }: Props) {
  const { ui } = useStores();
  const location = useLocation();
  const isMobile = useMobile();
  const direction = useDirection();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isResizing, setResizing] = React.useState(false);
  const splitPath = isMobile ? undefined : getSplitPath(location.search);
  const focusedPane = getFocusedSplitPane();

  // Return focus to the primary pane and reset the secondary pane's sidebar
  // and size whenever the split view closes.
  React.useEffect(() => {
    if (!splitPath) {
      setFocusedSplitPane("primary");
      ui.setRightSidebar(null, "secondary");
      ui.setSplitViewRatio(0.5);
    }
  }, [splitPath, ui]);

  const handleDrag = React.useCallback(
    (event: MouseEvent) => {
      // suppresses text selection
      event.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) {
        return;
      }

      const offset =
        direction === "rtl"
          ? rect.right - event.clientX
          : event.clientX - rect.left;
      ui.setSplitViewRatio(offset / rect.width);
    },
    [direction, ui]
  );

  const handleStopDrag = React.useCallback(() => {
    setResizing(false);
  }, []);

  const handleResizeStart = React.useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setResizing(true);
  }, []);

  const handleResizeReset = React.useCallback(() => {
    ui.setSplitViewRatio(0.5);
  }, [ui]);

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

  if (!splitPath) {
    return <>{children}</>;
  }

  return (
    <Container ref={containerRef}>
      <Pane
        pane="primary"
        isFocused={focusedPane === "primary"}
        style={{ flex: `0 0 ${ui.splitViewRatio * 100}%` }}
      >
        {children}
      </Pane>
      <SecondaryRouter splitPath={splitPath}>
        <Pane
          pane="secondary"
          isFocused={focusedPane === "secondary"}
          resizeBorder={
            <SplitResizeBorder
              dir="right"
              $transparent
              data-resize-handle
              onMouseDown={handleResizeStart}
              onDoubleClick={handleResizeReset}
            />
          }
        >
          {children}
        </Pane>
      </SecondaryRouter>
    </Container>
  );
});

type PaneProps = {
  pane: SplitViewPane;
  isFocused: boolean;
  /** Inline styles applied to the pane container, such as its size. */
  style?: React.CSSProperties;
  /** An optional resize handle rendered at the edge of the pane. */
  resizeBorder?: React.ReactNode;
  children: React.ReactNode;
};

const Pane = ({
  pane,
  isFocused,
  style,
  resizeBorder,
  children,
}: PaneProps) => {
  const { t } = useTranslation();
  const isSecondary = pane === "secondary";
  const contextValue = React.useMemo(
    () => ({ pane, isSplitView: true, isFocused }),
    [pane, isFocused]
  );

  const handleFocus = React.useCallback(
    (event: React.SyntheticEvent) => {
      // Grabbing the resize handle should not move focus between panes.
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("[data-resize-handle]")
      ) {
        return;
      }
      setFocusedSplitPane(pane);
    },
    [pane]
  );

  return (
    <PaneContainer
      role="group"
      aria-label={isSecondary ? t("Split pane") : t("Main pane")}
      $secondary={isSecondary}
      style={style}
      onMouseDownCapture={handleFocus}
      onFocusCapture={handleFocus}
    >
      <SplitViewContext.Provider value={contextValue}>
        <RightSidebarProvider>
          <PaneContent>
            <React.Suspense
              fallback={
                <CenteredContent>
                  <PlaceholderDocument />
                </CenteredContent>
              }
            >
              {children}
            </React.Suspense>
          </PaneContent>
          <PaneAside />
          <FocusRing $visible={isFocused} aria-hidden />
        </RightSidebarProvider>
      </SplitViewContext.Provider>
      {resizeBorder}
    </PaneContainer>
  );
};

/**
 * Renders the pane's right sidebar content, such as document comments or
 * history, inside the pane so that each pane displays the sidebar for its
 * own route. Rendered without open and close animations as the sidebar
 * content visibly overflows the pane while its width animates.
 */
const PaneAside = () => {
  const content = useRightSidebarContent();
  return <>{content}</>;
};

type SecondaryRouterProps = {
  /** The path currently displayed in the secondary pane. */
  splitPath: string;
  children: React.ReactNode;
};

/**
 * Hosts the secondary pane routes inside an in-memory router so navigation
 * within the pane, such as following document links, stays in the pane. The
 * pane location is mirrored to the split query parameter of the browser URL,
 * while navigation to routes that cannot render in a pane is promoted to the
 * primary browser history.
 */
const SecondaryRouter = ({ splitPath, children }: SecondaryRouterProps) => {
  const initialPathRef = React.useRef(splitPath);
  const memoryHistory = React.useMemo<MemoryHistory>(() => {
    const memory = createMemoryHistory({
      initialEntries: [initialPathRef.current],
    });
    const memoryPush = memory.push.bind(memory);
    const memoryReplace = memory.replace.bind(memory);

    const handled =
      (navigate: (to: LocationDescriptor) => void) =>
      (to: LocationDescriptor, state?: LocationState) => {
        const descriptor = toLocationDescriptor(to, state);
        const pathname = descriptor.pathname ?? memory.location.pathname;

        if (!isSplitablePath(pathname)) {
          history.push(descriptor);
          return;
        }

        navigate(descriptor);
      };

    memory.push = handled(memoryPush);
    memory.replace = handled(memoryReplace);
    return memory;
  }, []);

  // Mirror pane navigation into the split query parameter of the browser URL.
  React.useEffect(
    () =>
      memoryHistory.listen((paneLocation) => {
        const path = createPath(paneLocation);
        const current = history.location;

        if (getSplitPath(current.search) !== path) {
          history.replace(
            patchLocation(current, {
              search: setSplitPath(current.search, path),
            })
          );
        }
      }),
    [memoryHistory]
  );

  // Apply external changes to the split query parameter, such as opening a
  // different route in the split view or browser back/forward navigation.
  React.useEffect(() => {
    if (createPath(memoryHistory.location) !== splitPath) {
      memoryHistory.replace(splitPath);
    }
  }, [memoryHistory, splitPath]);

  return <Router history={memoryHistory}>{children}</Router>;
};

const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
`;

const PaneContainer = styled.div<{ $secondary: boolean }>`
  position: relative;
  display: flex;
  flex: 1 1 50%;
  min-width: 0;
  border-inline-start: ${(props) =>
    props.$secondary ? `1px solid ${props.theme.divider}` : "none"};
`;

const PaneContent = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

const SplitResizeBorder = styled(ResizeBorder)`
  z-index: ${depths.sidebar + 1};
`;

const FocusRing = styled.div<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: ${depths.sidebar + 1};
  box-shadow: inset 0 0 0 2px ${s("accent")};
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition: opacity 100ms ease-in-out;
`;
