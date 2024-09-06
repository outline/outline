import styled from "styled-components";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";

const Initials = styled(Flex)<{
  color?: string;
  size: number;
  $showBorder?: boolean;
}>`
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 100%;
  height: 100%;
  color: ${s("white75")};
  background-color: ${(props) => props.color};
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: 50%;
  border: 2px solid
    ${(props) =>
      props.$showBorder === false ? "transparent" : props.theme.background};
  flex-shrink: 0;
  font-size: ${(props) => props.size / 2}px;
  font-weight: 500;
`;

export default Initials;
