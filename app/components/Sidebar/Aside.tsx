import { m } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import ErrorBoundary from "~/components/ErrorBoundary";
import ResizeBorder from "~/components/Sidebar/components/ResizeBorder";
import useStores from "~/hooks/useStores";
import useWindowScrollbarWidth from "~/hooks/useWindowScrollbarWidth";
import { useResizeHandle } from "~/hooks/useResizeHandle";
import { sidebarAppearDuration } from "~/styles/animations";
import { useDirection } from "@radix-ui/react-direction";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  border?: boolean;
  /** When true, skip the entrance animation and render at full width immediately. */
  skipInitialAnimation?: boolean;
}

function Aside({ children, border, className, skipInitialAnimation }: Props) {
  const theme = useTheme();
  const { ui } = useStores();
  const positionRef = React.useRef<HTMLDivElement>(null);
  const maxWidth = theme.sidebarMaxWidth;
  const minWidth = theme.sidebarResizeMinWidth;
  const windowScrollbarWidth = useWindowScrollbarWidth();
  const direction = useDirection();

  const measure = React.useCallback(
    (event: MouseEvent) => {
      // Measure from the sidebar's own anchored edge rather than the window,
      // as in a split view the sidebar is not positioned at the window edge.
      const rect = positionRef.current?.getBoundingClientRect();
      if (!rect) {
        return undefined;
      }

      const distance =
        direction === "rtl"
          ? event.clientX - rect.left
          : rect.right - event.clientX;
      return distance + (windowScrollbarWidth ?? 0);
    },
    [direction, windowScrollbarWidth]
  );

  const handleResize = React.useCallback(
    (width: number) => ui.set({ sidebarRightWidth: width }),
    [ui]
  );

  const handleResizeEnd = React.useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Settle within the bounds if released while stretched beyond them.
    const settled = Math.max(
      Math.min(ui.sidebarRightWidth, maxWidth),
      minWidth
    );
    if (settled !== ui.sidebarRightWidth) {
      ui.set({ sidebarRightWidth: settled });
    }
  }, [ui, minWidth, maxWidth]);

  const { isResizing, startResize } = useResizeHandle({
    measure,
    onResize: handleResize,
    onResizeEnd: handleResizeEnd,
    min: minWidth,
    max: maxWidth,
  });

  const handleReset = React.useCallback(() => {
    ui.set({ sidebarRightWidth: theme.sidebarRightWidth });
  }, [ui, theme.sidebarRightWidth]);

  // Resizing tracks the pointer exactly, otherwise width changes spring – which also animates the
  // snap back to the maximum or minimum when released from a stretched position.
  const transition = isResizing
    ? { duration: 0 }
    : {
        type: "spring",
        bounce: 0.2,
        duration: sidebarAppearDuration / 1000,
      };

  const animationProps = {
    initial: skipInitialAnimation
      ? false
      : {
          width: 0,
          opacity: 0.9,
        },
    animate: {
      transition,
      width: ui.sidebarRightWidth,
      opacity: 1,
    },
    exit: {
      width: 0,
      opacity: 0,
    },
  };

  // The inner element is positioned out of flow, so it must follow the same width to stay in step
  // with the container it visually fills.
  const positionAnimationProps = {
    initial: false,
    animate: {
      transition,
      width: ui.sidebarRightWidth - (windowScrollbarWidth ?? 0),
    },
  };

  return (
    <Sidebar
      {...animationProps}
      $border={border}
      className={className}
      role="complementary"
      aria-label="Aside"
    >
      <Position ref={positionRef} {...positionAnimationProps}>
        <ErrorBoundary>{children}</ErrorBoundary>
        <ResizeBorder
          onMouseDown={startResize}
          onDoubleClick={handleReset}
          dir="right"
        />
      </Position>
    </Sidebar>
  );
}

const Position = styled(m.div)`
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  bottom: 0;
  max-width: 80%;
`;

const Sidebar = styled(m.div)<{
  $border?: boolean;
}>`
  display: block;
  flex-shrink: 0;
  background: ${s("background")};
  max-width: 80%;
  border-inline-start: 1px solid ${s("divider")};
  transition: border-inline-start 100ms ease-in-out;
  z-index: ${depths.sidebar};

  ${breakpoint("mobile", "tablet")`
    display: flex;
    position: absolute;
    top: 0;
    inset-inline-end: 0;
    bottom: 0;
    z-index: ${depths.mobileSidebar};
  `}

  ${breakpoint("tablet")`
    position: relative;
  `}
`;

export default observer(Aside);
