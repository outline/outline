import * as React from "react";
import styled from "styled-components";

function DropCursor({
  isActiveDrop,
  innerRef,
  position,
}: {
  isActiveDrop: boolean;
  innerRef: React.Ref<HTMLDivElement>;
  position?: "top";
}) {
  return <Cursor isOver={isActiveDrop} ref={innerRef} position={position} />;
}

// transparent hover zone with a thin visible band vertically centered
const Cursor = styled.div<{ isOver?: boolean; position?: "top" }>`
  opacity: ${(props) => (props.isOver ? 1 : 0)};
  transition: opacity 150ms;
  position: absolute;
  z-index: 1;

  width: 100%;
  height: 14px;
  background: transparent;
  ${(props) => (props.position === "top" ? "top: 25px;" : "bottom: -7px;")}

  ::after {
    background: ${(props) => props.theme.slateDark};
    position: absolute;
    top: 6px;
    content: "";
    height: 2px;
    border-radius: 2px;
    width: 100%;
  }
`;

export default DropCursor;
