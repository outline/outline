// @flow
import styled from "styled-components";
import ResizeHandle from "./ResizeHandle";

const ResizeBorder = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  right: -6px;
  width: 12px;
  cursor: ew-resize;

  ${(props) =>
    props.$isResizing &&
    `
  ${ResizeHandle} {
    opacity: 1;
  }
  `}

  &:hover {
    ${ResizeHandle} {
      opacity: 1;
    }
  }
`;

export default ResizeBorder;
