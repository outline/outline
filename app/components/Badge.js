// @flow
import styled from "styled-components";

const Badge = styled.span`
  margin-left: 10px;
  padding: 2px 6px 3px;
  background-color: ${({ yellow, primary, theme }) =>
    yellow ? theme.yellow : primary ? theme.primary : theme.textTertiary};
  color: ${({ primary, yellow, theme }) =>
    primary ? theme.white : yellow ? theme.almostBlack : theme.background};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  user-select: none;
`;

export default Badge;
