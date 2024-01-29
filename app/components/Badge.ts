import { transparentize } from "polished";
import styled from "styled-components";

const Badge = styled.span<{ yellow?: boolean; primary?: boolean }>`
  margin-left: 10px;
  padding: 1px 5px 2px;
  background-color: ${({ yellow, primary, theme }) =>
    yellow ? theme.yellow : primary ? theme.accent : "transparent"};
  color: ${({ primary, yellow, theme }) =>
    primary
      ? theme.accentText
      : yellow
      ? theme.almostBlack
      : theme.textTertiary};
  border: 1px solid
    ${({ primary, yellow, theme }) =>
      primary || yellow
        ? "transparent"
        : transparentize(0.4, theme.textTertiary)};
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  user-select: none;
`;

export default Badge;
