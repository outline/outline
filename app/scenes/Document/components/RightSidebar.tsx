import { BackIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";

type Props = {
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: React.MouseEventHandler;
};

export default function RightSidebar({ title, onClose, children }: Props) {
  return (
    <Sidebar>
      <Position column>
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
  width: ${(props) => props.theme.sidebarWidth}px;
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
