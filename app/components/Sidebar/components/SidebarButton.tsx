import { ExpandedIcon, MoreIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";

type Props = {
  title: React.ReactNode;
  image: React.ReactNode;
  rounded?: boolean;
  showDisclosure?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
};

const SidebarButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ showDisclosure, image, title, ...rest }: Props, ref) => (
    <Wrapper
      justify="space-between"
      align="center"
      as="button"
      {...rest}
      ref={ref}
    >
      <Title gap={8} align="center">
        {image} {title}
      </Title>
      {showDisclosure ? (
        <ExpandedIcon color="currentColor" />
      ) : (
        <MoreIcon color="currentColor" />
      )}
    </Wrapper>
  )
);

const Title = styled(Flex)`
  color: ${(props) => props.theme.text};
`;

const Wrapper = styled(Flex)`
  padding: 8px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 4px;
  margin: 4px;
  color: ${(props) => props.theme.sidebarText};
  border: 0;
  background: none;

  white-space: nowrap;
  -webkit-appearance: none;
  text-decoration: none;
  text-align: left;
  text-overflow: ellipsis;
  overflow: hidden;

  &:active,
  &:hover {
    transition: background 100ms ease-in-out;
    background: ${(props) => props.theme.sidebarItemBackground};
  }
`;

export default SidebarButton;
