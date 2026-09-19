import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import { undraggableOnDesktop } from "~/styles";

const ResizeBorder = styled.div<{
  dir?: "left" | "right";
  /** When true, the border does not highlight on hover. */
  $transparent?: boolean;
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  inset-inline-end: ${(props) => (props.dir !== "right" ? "-1px" : "auto")};
  inset-inline-start: ${(props) => (props.dir === "right" ? "-1px" : "auto")};
  width: 2px;
  cursor: col-resize;
  ${undraggableOnDesktop()}

  ${(props) =>
    !props.$transparent &&
    css`
      &:hover {
        transition-delay: 500ms;
        transition: background 250ms ease-in-out;
        background: ${s("sidebarActiveBackground")};
      }
    `}

  &:after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    inset-inline-end: -4px;
    width: 10px;
    ${undraggableOnDesktop()}
  }
`;

export default ResizeBorder;
