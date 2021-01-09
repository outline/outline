// @flow
import { rgba } from "polished";
import * as React from "react";
import { Menu } from "reakit/Menu";
import styled from "styled-components";
import { fadeAndScaleIn } from "shared/styles/animations";

export default function ContextMenu({ children, ...rest }) {
  console.log(rest);
  return (
    <Menu {...rest}>{(props) => <Wrapper {...props}>{children}</Wrapper>}</Menu>
  );
}

const Wrapper = styled.div`
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: ${(props) => (props.left !== undefined ? "25%" : "75%")} 0;
  backdrop-filter: blur(10px);
  background: ${(props) => rgba(props.theme.menuBackground, 0.8)};
  border: ${(props) =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  border-radius: 2px;
  padding: 0.5em 0;
  min-width: 180px;
  overflow: hidden;
  overflow-y: auto;
  box-shadow: ${(props) => props.theme.menuShadow};
  pointer-events: all;

  hr {
    margin: 0.5em 12px;
  }

  @media print {
    display: none;
  }
`;
