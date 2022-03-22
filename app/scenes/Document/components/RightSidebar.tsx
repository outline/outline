import { observer } from "mobx-react";
import { BackIcon } from "outline-icons";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import ResizeBorder from "~/components/Sidebar/components/ResizeBorder";
import useStores from "~/hooks/useStores";

type Props = {
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: React.MouseEventHandler;
};

function RightSidebar({ title, onClose, children }: Props) {
  const theme = useTheme();
  const { ui } = useStores();
  const setWidth = ui.setSidebarRightWidth;
  const [isResizing, setResizing] = React.useState(false);
  const width = ui.sidebarRightWidth;
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
      setWidth(width);
    },
    [minWidth, maxWidth, setWidth]
  );

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
      width: `${width}px`,
    }),
    [width]
  );

  return (
    <Sidebar style={style}>
      <Position style={style} column>
        <Header>
          <Title>{title}</Title>
          <Button
            icon={<ForwardIcon />}
            onClick={onClose}
            borderOnHover
            neutral
          />
        </Header>
        <Scrollable topShadow>{children}</Scrollable>
        <ResizeBorder onMouseDown={handleMouseDown} dir="right" />
      </Position>
    </Sidebar>
  );
}

const ForwardIcon = styled(BackIcon)`
  transform: rotate(180deg);
  flex-shrink: 0;
`;

const Position = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
`;

const Sidebar = styled(Flex)`
  display: none;
  position: relative;
  flex-shrink: 0;
  background: ${(props) => props.theme.background};
  width: ${(props) => props.theme.sidebarWidth}px;
  border-left: 1px solid transparent;
  transition: border-left 100ms ease-in-out;
  z-index: 1;

  &:hover,
  &:focus-within {
    border-left: 1px solid ${(props) => props.theme.divider};
  }

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const Title = styled(Flex)`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: flex-start;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  width: 0;
  flex-grow: 1;
`;

const Header = styled(Flex)`
  align-items: center;
  position: relative;
  padding: 16px;
  color: ${(props) => props.theme.text};
  flex-shrink: 0;
`;

export default observer(RightSidebar);
