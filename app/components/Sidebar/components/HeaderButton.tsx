import { ExpandedIcon, MoreIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import { undraggableOnDesktop } from "~/styles";

export type HeaderButtonProps = React.ComponentProps<typeof Wrapper> & {
  title: React.ReactNode;
  image: React.ReactNode;
  minHeight?: number;
  rounded?: boolean;
  showDisclosure?: boolean;
  showMoreMenu?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
};

const HeaderButton = React.forwardRef<HTMLButtonElement, HeaderButtonProps>(
  (
    {
      showDisclosure,
      showMoreMenu,
      image,
      title,
      minHeight = 0,
      ...rest
    }: HeaderButtonProps,
    ref
  ) => (
    <Wrapper
      role="button"
      justify="space-between"
      align="center"
      as="button"
      minHeight={minHeight}
      {...rest}
      ref={ref}
    >
      <Title gap={6} align="center">
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

const Wrapper = styled(Flex)<{ minHeight: number }>`
  padding: 8px 4px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 4px;
  margin: 8px;
  color: ${(props) => props.theme.textTertiary};
  border: 0;
  background: none;
  flex-shrink: 0;
  min-height: ${(props) => props.minHeight}px;

  -webkit-appearance: none;
  text-decoration: none;
  text-align: left;
  overflow: hidden;
  user-select: none;
  cursor: var(--pointer);
  ${undraggableOnDesktop()}

  &:active,
  &:hover,
  &[aria-expanded="true"] {
    color: ${(props) => props.theme.sidebarText};
    transition: background 100ms ease-in-out;
    background: ${(props) => props.theme.sidebarActiveBackground};
  }
`;

export default HeaderButton;
