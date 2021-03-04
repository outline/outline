// @flow
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Arrow from "components/Arrow";

type Props = {
  direction: "left" | "right",
  style?: Object,
  onClick?: () => any,
};

const Toggle = React.forwardRef<Props, HTMLButtonElement>(
  ({ direction = "left", onClick, style }: Props, ref) => {
    return (
      <Positioner style={style}>
        <ToggleButton ref={ref} $direction={direction} onClick={onClick}>
          <Arrow />
        </ToggleButton>
      </Positioner>
    );
  }
);

export const ToggleButton = styled.button`
  opacity: 0;
  background: none;
  transition: opacity 100ms ease-in-out;
  transform: translateY(-50%)
    scaleX(${(props) => (props.$direction === "left" ? 1 : -1)});
  position: absolute;
  top: 50vh;
  padding: 8px;
  border: 0;
  pointer-events: none;
  color: ${(props) => props.theme.divider};

  &:active {
    color: ${(props) => props.theme.sidebarText};
  }

  ${breakpoint("tablet")`
    pointer-events: all;
    cursor: pointer;
  `}
`;

export const Positioner = styled.div`
  display: none;
  z-index: 2;
  position: absolute;
  top: 0;
  bottom: 0;
  right: -30px;
  width: 30px;

  &:hover ${ToggleButton}, &:focus-within ${ToggleButton} {
    opacity: 1;
  }

  ${breakpoint("tablet")`
    display: block;
  `}
`;

export default Toggle;
