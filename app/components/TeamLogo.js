// @flow
import styled from "styled-components";

const TeamLogo = styled.img`
  width: ${(props) => props.size || "auto"};
  height: ${(props) => props.size || "38px"};
  border-radius: 4px;
  background: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.divider};
  overflow: hidden;
`;

export default TeamLogo;
