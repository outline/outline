// @flow
import * as React from "react";
import { Popover as ReakitPopover } from "reakit/Popover";
import styled from "styled-components";
import { fadeAndScaleIn } from "shared/styles/animations";

type Props = {
  children: React.Node,
  width?: number,
};

function Popover({ children, width = 380, ...rest }: Props) {
  return (
    <ReakitPopover {...rest}>
      <Contents width={width}>{children}</Contents>
    </ReakitPopover>
  );
}

const Contents = styled.div`
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: 75% 0;
  background: ${(props) => props.theme.menuBackground};
  border-radius: 6px;
  padding: 12px 24px;
  max-height: 50vh;
  overflow-y: scroll;
  width: ${(props) => props.width}px;
  box-shadow: ${(props) => props.theme.menuShadow};
  border: ${(props) =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
`;

export default Popover;
