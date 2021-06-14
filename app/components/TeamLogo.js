// @flow
import styled from "styled-components";

const TeamLogo = styled.img`
  width: ${(props) =>
    props.width ? `${props.width}px` : props.size || "auto"};
  height: ${(props) =>
    props.height ? `${props.height}px` : props.size || "38px"};
  border-radius: 4px;
  background: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.divider};
  overflow: hidden;
  flex-shrink: 0;
`;

export default TeamLogo;
