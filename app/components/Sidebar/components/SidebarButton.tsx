import { MoreIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { extraArea, s } from "@shared/styles";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { draggableOnDesktop, undraggableOnDesktop } from "~/styles";
import Desktop from "~/utils/Desktop";

export type SidebarButtonProps = React.ComponentProps<typeof Button> & {
  position: "top" | "bottom";
  title: React.ReactNode;
  image: React.ReactNode;
  showMoreMenu?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
};

const SidebarButton = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
  function _SidebarButton(
    {
      position = "top",
      showMoreMenu,
      image,
      title,
      children,
      ...rest
    }: SidebarButtonProps,
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
          $position={position}
          as="button"
          ref={ref}
          role="button"
        >
          <Content gap={8} align="center">
            {image}
            {title && <Title>{title}</Title>}
          </Content>
          {showMoreMenu && <StyledMoreIcon />}
        </Button>
        {children}
      </Container>
    );
  }
);

const StyledMoreIcon = styled(MoreIcon)`
  flex-shrink: 0;
`;

const Container = styled(Flex)<{ $position: "top" | "bottom" }>`
  overflow: hidden;
  padding-top: ${(props) =>
    props.$position === "top" && Desktop.hasInsetTitlebar() ? 36 : 0}px;
  ${draggableOnDesktop()}
`;

const Title = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Content = styled(Flex)`
  flex-shrink: 1;
  flex-grow: 1;
`;

const Button = styled(Flex)<{
  $position: "top" | "bottom";
}>`
  flex: 1;
  color: ${s("textTertiary")};
  align-items: center;
  padding: 4px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 4px;
  border: 0;
  margin: ${(props) => (props.$position === "top" ? 16 : 8)}px 0;
  background: none;
  flex-shrink: 0;

  -webkit-appearance: none;
  text-decoration: none;
  text-align: left;
  user-select: none;
  cursor: var(--pointer);
  position: relative;

  ${undraggableOnDesktop()}
  ${extraArea(4)}

  &:active,
  &:hover,
  &[aria-expanded="true"] {
    color: ${s("sidebarText")};
    background: ${s("sidebarActiveBackground")};
  }

  &:last-child {
    margin-right: 8px;
  }

  &:first-child {
    margin-left: 8px;
  }
`;

export default SidebarButton;
