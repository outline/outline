import { darken, transparentize } from "polished";
import styled from "styled-components";

const Badge = styled.span<{ yellow?: boolean; primary?: boolean }>`
  padding: 1.5px 5.5px;
  margin: 0 2px;
  background: ${({ yellow, primary, theme }) =>
    yellow
      ? transparentize(0.85, theme.yellow)
      : primary
        ? transparentize(0.85, theme.accent)
        : "transparent"};
  color: ${({ primary, yellow, theme }) =>
    primary
      ? theme.accent
      : yellow
        ? darken(0.1, theme.yellow)
        : theme.textTertiary};
  border: 1px solid
    ${({ yellow, primary, theme }) =>
      yellow
        ? transparentize(0.25, theme.yellow)
        : primary
          ? transparentize(0.25, theme.accent)
          : theme.textTertiary};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  user-select: none;
  white-space: nowrap;
`;

export default Badge;
