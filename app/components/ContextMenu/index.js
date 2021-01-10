// @flow
import { rgba } from "polished";
import * as React from "react";
import { Menu } from "reakit/Menu";
import styled from "styled-components";
import { fadeAndScaleIn } from "shared/styles/animations";

type Props = {|
  "aria-label": string,
  children: React.Node,
|};

export default function ContextMenu({ children, ...rest }: Props) {
  return (
    <Menu {...rest}>
      {(props) => (
        <Position {...props}>
          <Background>{children}</Background>
        </Position>
      )}
    </Menu>
  );
}

const Position = styled.div`
  position: absolute;
  z-index: ${(props) => props.theme.depths.menu};
`;

const Background = styled.div`
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: ${(props) => (props.left !== undefined ? "25%" : "75%")} 0;
  background: ${(props) => rgba(props.theme.menuBackground, 0.95)};
  border: ${(props) =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  border-radius: 2px;
  padding: 0.5em 0;
  min-width: 180px;
  overflow: hidden;
  overflow-y: auto;
  box-shadow: ${(props) => props.theme.menuShadow};
  pointer-events: all;
  font-weight: normal;

  @media print {
    display: none;
  }
`;
