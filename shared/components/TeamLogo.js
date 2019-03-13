// @flow
import styled from 'styled-components';
import { darken } from 'polished';

const TeamLogo = styled.img`
  width: 38px;
  height: 38px;
  border-radius: 4px;
  background: ${props => props.theme.white};
  border: 1px solid ${props => darken(0.1, props.theme.sidebarBackground)};
`;

export default TeamLogo;
