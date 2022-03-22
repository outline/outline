import styled from "styled-components";

const ResizeBorder = styled.div<{ dir?: "left" | "right" }>`
  position: absolute;
  top: 0;
  bottom: 0;
  right: ${(props) => (props.dir !== "right" ? "-6px" : "auto")};
  left: ${(props) => (props.dir === "right" ? "-6px" : "auto")};
  width: 12px;
  cursor: col-resize;
`;

export default ResizeBorder;
