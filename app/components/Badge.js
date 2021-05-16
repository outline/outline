// @flow
import styled from "styled-components";

const Badge = styled.span`
  margin-left: 10px;
  padding: 1px 5px 2px;
  background-color: ${({ yellow, primary, theme }) =>
    yellow ? theme.yellow : primary ? theme.primary : "transparent"};
  color: ${({ primary, yellow, theme }) =>
    primary ? theme.white : yellow ? theme.almostBlack : theme.textTertiary};
  border: 1px solid
    ${({ primary, yellow, theme }) =>
      primary || yellow ? "transparent" : theme.textTertiary};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  user-select: none;
`;

export default Badge;
