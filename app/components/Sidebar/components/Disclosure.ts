import { CollapsedIcon } from "outline-icons";
import styled from "styled-components";

const Disclosure = styled(CollapsedIcon).attrs(() => ({
  color: "currentColor",
}))<{
  expanded?: boolean;
}>`
  transition: opacity 100ms ease, transform 100ms ease, fill 50ms !important;
  color: ${(props) => props.theme.textTertiary};
  flex-shrink: 0;
  position: absolute;
  left: -20px;

  ${(props) => !props.expanded && "transform: rotate(-90deg);"};
`;

export default Disclosure;
