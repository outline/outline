import styled from "styled-components";
import CircleIcon from "./CircleIcon";

export const DottedCircleIcon = styled(CircleIcon)`
  circle {
    stroke: ${(props) => props.theme.textSecondary};
    stroke-dasharray: 2, 2;
  }
`;
