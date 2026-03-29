import { transparentize } from "polished";
import styled from "styled-components";

const Badge = styled.span<{ yellow?: boolean; primary?: boolean }>`
  padding: 1.5px 5.5px;
  margin: 0 2px;
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
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  user-select: none;
  white-space: nowrap;
`;

export default Badge;
