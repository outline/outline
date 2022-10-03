import { m } from "framer-motion";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Flex from "~/components/Flex";

const SidebarRight: React.FC = ({ children }) => {
  const theme = useTheme();

  return (
    <Sidebar
      initial={{
        width: 0,
      }}
      animate={{
        transition: {
          type: "spring",
          bounce: 0.2,
          duration: 0.6,
        },
        width: theme.sidebarWidth,
      }}
      exit={{
        width: 0,
      }}
    >
      <Position column>{children}</Position>
    </Sidebar>
  );
};

const Position = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  width: ${(props) => props.theme.sidebarWidth}px;
`;

const Sidebar = styled(m.div)`
  display: none;
  position: relative;
  flex-shrink: 0;
  background: ${(props) => props.theme.background};
  width: ${(props) => props.theme.sidebarWidth}px;
  border-left: 1px solid ${(props) => props.theme.divider};
  z-index: 1;

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

export default SidebarRight;
