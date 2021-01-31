// @flow
import styled from "styled-components";
import { ResizeButton } from "./ResizeHandle";

const ResizeBorder = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  right: -6px;
  width: 12px;
  cursor: ew-resize;

  &:hover {
    ${ResizeButton} {
      opacity: 1;
    }
  }

  ${(props) =>
    props.$isResizing &&
    `
  ${ResizeButton} {
    opacity: 1;
  }
  `}
`;

export default ResizeBorder;
