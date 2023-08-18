import { ExpandedIcon, MoreIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import { draggableOnDesktop, undraggableOnDesktop } from "~/styles";
import Desktop from "~/utils/Desktop";

export type FullWidthButtonProps = React.ComponentProps<typeof Button> & {
  position: "top" | "bottom";
  title: React.ReactNode;
  image: React.ReactNode;
  minHeight?: number;
  rounded?: boolean;
  showDisclosure?: boolean;
  showMoreMenu?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
};

const FullWidthButton = React.forwardRef<
  HTMLButtonElement,
  FullWidthButtonProps
>(function _FullWidthButton(
  {
    position = "top",
    showDisclosure,
    showMoreMenu,
    image,
    title,
    minHeight = 0,
    children,
    ...rest
  }: FullWidthButtonProps,
  ref
) {
  return (
    <Container
      justify="space-between"
      align="center"
      shrink={false}
      $position={position}
    >
      <Button
        {...rest}
        minHeight={minHeight}
        as="button"
        ref={ref}
        role="button"
      >
        <Title gap={8} align="center">
          {image}
          {title}
        </Title>
        {showDisclosure && <ExpandedIcon />}
        {showMoreMenu && <MoreIcon />}
      </Button>
      {children}
    </Container>
  );
});

const Container = styled(Flex)<{ $position: "top" | "bottom" }>`
  padding-top: ${(props) =>
    props.$position === "top" && Desktop.hasInsetTitlebar() ? 36 : 0}px;
  ${draggableOnDesktop()}
`;

const Title = styled(Flex)`
  color: ${s("text")};
  flex-shrink: 1;
  flex-grow: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const Button = styled(Flex)<{ minHeight: number }>`
  flex: 1;
  color: ${s("textTertiary")};
  align-items: center;
  padding: 8px 4px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 4px;
  margin: 8px 0;
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
    color: ${s("sidebarText")};
    transition: background 100ms ease-in-out;
    background: ${s("sidebarActiveBackground")};
  }

  &:last-child {
    margin-right: 8px;
  }

  &:first-child {
    margin-left: 8px;
  }
`;

export default FullWidthButton;
