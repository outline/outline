import { m } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Flex from "~/components/Flex";
import ResizeBorder from "~/components/Sidebar/components/ResizeBorder";
import useStores from "~/hooks/useStores";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  border?: boolean;
};

function Right({ children, border, className }: Props) {
  const theme = useTheme();
  const { ui } = useStores();
  const [isResizing, setResizing] = React.useState(false);
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
      ui.setRightSidebarWidth(width);
    },
    [minWidth, maxWidth, ui]
  );

  const handleReset = React.useCallback(() => {
    ui.setRightSidebarWidth(theme.sidebarRightWidth);
  }, [ui, theme.sidebarRightWidth]);

  const handleStopDrag = React.useCallback(() => {
    setResizing(false);

    if (document.activeElement) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'blur' does not exist on type 'Element'.
      document.activeElement.blur();
    }
  }, []);

  const handleMouseDown = React.useCallback(() => {
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

  return (
    <Sidebar
      initial={{
        width: 0,
      }}
      animate={{
        transition: isResizing
          ? { duration: 0 }
          : {
              type: "spring",
              bounce: 0.2,
              duration: 0.6,
            },
        width: ui.sidebarRightWidth,
      }}
      exit={{
        width: 0,
      }}
      $border={border}
      className={className}
    >
      <Position style={style} column>
        {children}
        <ResizeBorder
          onMouseDown={handleMouseDown}
          onDoubleClick={handleReset}
          dir="right"
        />
      </Position>
    </Sidebar>
  );
}

const Position = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
`;

const Sidebar = styled(m.div)<{ $border?: boolean }>`
  display: none;
  position: relative;
  flex-shrink: 0;
  background: ${(props) => props.theme.background};
  width: ${(props) => props.theme.sidebarRightWidth}px;
  border-left: 1px solid ${(props) => props.theme.divider};
  transition: border-left 100ms ease-in-out;
  z-index: 1;

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

export default observer(Right);
