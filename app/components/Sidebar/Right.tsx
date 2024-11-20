import { m } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import ErrorBoundary from "~/components/ErrorBoundary";
import Flex from "~/components/Flex";
import ResizeBorder from "~/components/Sidebar/components/ResizeBorder";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import { sidebarAppearDuration } from "~/styles/animations";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  border?: boolean;
}

function Right({ children, border, className }: Props) {
  const theme = useTheme();
  const { ui } = useStores();
  const [isResizing, setResizing] = React.useState(false);
  const isMobile = useMobile();
  const maxWidth = theme.sidebarMaxWidth;
  const minWidth = theme.sidebarMinWidth + 16; // padding

  const handleDrag = React.useCallback(
    (event: MouseEvent) => {
      // suppresses text selection
      event.preventDefault();
      const width = Math.max(
        Math.min(window.innerWidth - event.pageX, maxWidth),
        minWidth
      );
      ui.set({ sidebarRightWidth: width });
    },
    [minWidth, maxWidth, ui]
  );

  const handleReset = React.useCallback(() => {
    ui.set({ sidebarRightWidth: theme.sidebarRightWidth });
  }, [ui, theme.sidebarRightWidth]);

  const handleStopDrag = React.useCallback(() => {
    setResizing(false);

    if (document.activeElement) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'blur' does not exist on type 'Element'.
      document.activeElement.blur();
    }
  }, []);

  const handleMouseDown = React.useCallback((event) => {
    event.preventDefault();
    setResizing(true);
  }, []);

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

  const style = React.useMemo(
    () => ({
      width: `${ui.sidebarRightWidth}px`,
    }),
    [ui.sidebarRightWidth]
  );

  const animationProps = {
    initial: {
      width: 0,
      opacity: 0.9,
    },
    animate: {
      transition: isResizing
        ? { duration: 0 }
        : {
            type: "spring",
            bounce: 0.2,
            duration: sidebarAppearDuration / 1000,
          },
      width: ui.sidebarRightWidth,
      opacity: 1,
    },
    exit: {
      width: 0,
      opacity: 0,
    },
  };

  return (
    <Sidebar {...animationProps} $border={border} className={className}>
      <Position style={style} column>
        <ErrorBoundary>{children}</ErrorBoundary>
        {!isMobile && (
          <ResizeBorder
            onMouseDown={handleMouseDown}
            onDoubleClick={handleReset}
            dir="right"
          />
        )}
      </Position>
    </Sidebar>
  );
}

const Position = styled(Flex)`
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
  border-left: 1px solid ${s("divider")};
  transition: border-left 100ms ease-in-out;
  z-index: 1;

  ${breakpoint("mobile", "tablet")`
    display: flex;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: ${depths.mobileSidebar};
  `}

  ${breakpoint("tablet")`
    position: relative;
  `}
`;

export default observer(Right);
