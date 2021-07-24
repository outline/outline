// @flow
import { CollapsedIcon } from "outline-icons";
import styled from "styled-components";

const Disclosure = styled(CollapsedIcon)`
  transition: transform 100ms ease, fill 50ms !important;
  position: absolute;
  left: -24px;

  ${({ expanded }) => !expanded && "transform: rotate(-90deg);"};
`;

export default Disclosure;
