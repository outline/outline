import styled from "styled-components";
import { s } from "@shared/styles";
import { undraggableOnDesktop } from "~/styles";

const ResizeBorder = styled.div<{ dir?: "left" | "right" }>`
  position: absolute;
  top: 0;
  bottom: 0;
  right: ${(props) => (props.dir !== "right" ? "-1px" : "auto")};
  left: ${(props) => (props.dir === "right" ? "-1px" : "auto")};
  width: 2px;
  cursor: col-resize;
  ${undraggableOnDesktop()}

  &:hover {
    transition-delay: 500ms;
    transition: background 250ms ease-in-out;
    background: ${s("sidebarActiveBackground")};
  }

  &:after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    right: -4px;
    width: 10px;
    ${undraggableOnDesktop()}
  }
`;

export default ResizeBorder;
