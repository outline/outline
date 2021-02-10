// @flow
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

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
          <svg
            width="13"
            height="30"
            viewBox="0 0 13 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              d="M7.40242 1.48635C8.23085 0.0650039 10.0656 -0.421985 11.5005 0.39863C12.9354 1.21924 13.427 3.03671 12.5986 4.45806L5.59858 16.4681C4.77015 17.8894 2.93538 18.3764 1.5005 17.5558C0.065623 16.7352 -0.426002 14.9177 0.402425 13.4964L7.40242 1.48635Z"
            />
            <path
              fill="currentColor"
              d="M12.5986 25.5419C13.427 26.9633 12.9354 28.7808 11.5005 29.6014C10.0656 30.422 8.23087 29.935 7.40244 28.5136L0.402438 16.5036C-0.425989 15.0823 0.0656365 13.2648 1.50051 12.4442C2.93539 11.6236 4.77016 12.1106 5.59859 13.5319L12.5986 25.5419Z"
            />
          </svg>
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
  z-index: 2;
  position: absolute;
  top: 0;
  bottom: 0;
  right: -30px;
  width: 30px;

  &:hover ${ToggleButton}, &:focus-within ${ToggleButton} {
    opacity: 1;
  }
`;

export default Toggle;
