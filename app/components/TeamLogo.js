// @flow
import styled from "styled-components";

const TeamLogo = styled.img`
  width: auto;
  height: 38px;
  border-radius: 4px;
  background: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.divider};
`;

export default TeamLogo;
