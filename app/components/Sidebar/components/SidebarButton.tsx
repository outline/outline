import { ExpandedIcon, MoreIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";

type Props = {
  title: React.ReactNode;
  image: React.ReactNode;
  rounded?: boolean;
  showDisclosure?: boolean;
  showMoreMenu?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
};

const SidebarButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ showDisclosure, showMoreMenu, image, title, ...rest }: Props, ref) => (
    <Wrapper
      justify="space-between"
      align="center"
      as="button"
      {...rest}
      ref={ref}
    >
      <Title gap={4} align="center">
        {image}
        {title}
      </Title>
      {showDisclosure && <ExpandedIcon color="currentColor" />}
      {showMoreMenu && <MoreIcon color="currentColor" />}
    </Wrapper>
  )
);

const Title = styled(Flex)`
  color: ${(props) => props.theme.text};
  flex-shrink: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const Wrapper = styled(Flex)`
  padding: 8px 4px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 4px;
  margin: 8px;
  color: ${(props) => props.theme.textTertiary};
  border: 0;
  background: none;
  flex-shrink: 0;

  -webkit-appearance: none;
  text-decoration: none;
  text-align: left;
  overflow: hidden;
  user-select: none;
  cursor: pointer;

  &:active,
  &:hover {
    color: ${(props) => props.theme.sidebarText};
    transition: background 100ms ease-in-out;
    background: ${(props) => props.theme.sidebarActiveBackground};
  }
`;

export default SidebarButton;
