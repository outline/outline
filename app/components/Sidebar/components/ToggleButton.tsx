import styled from "styled-components";
import { hover } from "~/styles";
import SidebarButton from "./SidebarButton";

const ToggleButton = styled(SidebarButton)`
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  &:${hover},
  &:active {
    opacity: 1;
  }
`;

export default ToggleButton;
