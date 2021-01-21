// @flow
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

const ResizeHandle = styled.button`
  opacity: 0;
  transition: opacity 100ms ease-in-out;
  transform: translateY(-50%);
  position: absolute;
  top: 50%;
  height: 40px;
  right: -10px;
  width: 8px;
  padding: 0;
  border: 0;
  background: ${(props) => props.theme.sidebarBackground};
  border-radius: 8px;
  pointer-events: none;

  &:after {
    content: "";
    position: absolute;
    top: -24px;
    bottom: -24px;
    left: -12px;
    right: -12px;
  }

  &:active {
    background: ${(props) => props.theme.sidebarText};
  }

  ${breakpoint("tablet")`
    pointer-events: all;
    cursor: ew-resize;
  `}
`;

export default ResizeHandle;
