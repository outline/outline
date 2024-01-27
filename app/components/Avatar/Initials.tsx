import styled from "styled-components";
import Flex from "~/components/Flex";

const Initials = styled(Flex)<{
  color?: string;
  shape?: "square";
  size: number;
  $showBorder?: boolean;
}>`
  align-items: center;
  justify-content: center;
  border-radius: ${(props) => (props.shape === "square" ? 4 : props.size)}px;
  color: #fff;
  background-color: ${(props) => props.color};
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border: 2px solid
    ${(props) =>
      props.$showBorder === false ? "transparent" : props.theme.background};
  flex-shrink: 0;
  font-size: ${(props) => props.size / 2}px;
  font-weight: 500;
`;

export default Initials;
