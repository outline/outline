import type { CSSProperties } from "react";
import styled from "styled-components";
import type { SpacingValue } from "../styles/spacing";
import { resolveSpacing } from "../styles/spacing";

type JustifyValues = CSSProperties["justifyContent"];

type AlignValues = CSSProperties["alignItems"];

/**
 * Flex is a styled component that provides a flexible box layout with convenient props.
 * It simplifies the use of flexbox CSS properties with a clean, declarative API.
 */
const Flex = styled.div.withConfig({
  shouldForwardProp: (prop) =>
    ![
      "auto",
      "column",
      "align",
      "justify",
      "wrap",
      "shrink",
      "reverse",
      "gap",
      "p",
      "px",
      "py",
      "m",
      "mx",
      "my",
    ].includes(prop),
})<{
  /** Makes the component grow to fill available space */
  auto?: boolean;
  /** Changes flex direction to column */
  column?: boolean;
  /** Sets the align-items CSS property */
  align?: AlignValues;
  /** Sets the justify-content CSS property */
  justify?: JustifyValues;
  /** Enables flex-wrap */
  wrap?: boolean;
  /** Controls flex-shrink behavior */
  shrink?: boolean;
  /** Reverses the direction (row-reverse or column-reverse) */
  reverse?: boolean;
  /** Sets gap between flex items — spacing token or raw pixels */
  gap?: SpacingValue;
  /** Padding on all sides — spacing token or raw pixels */
  p?: SpacingValue;
  /** Inline-axis (horizontal in LTR) padding — spacing token or raw pixels */
  px?: SpacingValue;
  /** Block-axis (vertical) padding — spacing token or raw pixels */
  py?: SpacingValue;
  /** Margin on all sides — spacing token or raw pixels */
  m?: SpacingValue;
  /** Inline-axis (horizontal in LTR) margin — spacing token or raw pixels */
  mx?: SpacingValue;
  /** Block-axis (vertical) margin — spacing token or raw pixels */
  my?: SpacingValue;
}>`
  display: flex;
  flex: ${({ auto }) => (auto ? "1 1 auto" : "initial")};
  flex-direction: ${({ column, reverse }) =>
    reverse
      ? column
        ? "column-reverse"
        : "row-reverse"
      : column
        ? "column"
        : "row"};
  align-items: ${({ align }) => align};
  justify-content: ${({ justify }) => justify};
  flex-wrap: ${({ wrap }) => (wrap ? "wrap" : "initial")};
  flex-shrink: ${({ shrink }) =>
    shrink === true ? 1 : shrink === false ? 0 : "initial"};
  gap: ${({ gap }) =>
    gap !== undefined ? `${resolveSpacing(gap)}px` : "initial"};
  ${({ p }) => (p !== undefined ? `padding: ${resolveSpacing(p)}px;` : "")}
  ${({ px }) =>
    px !== undefined ? `padding-inline: ${resolveSpacing(px)}px;` : ""}
  ${({ py }) =>
    py !== undefined ? `padding-block: ${resolveSpacing(py)}px;` : ""}
  ${({ m }) => (m !== undefined ? `margin: ${resolveSpacing(m)}px;` : "")}
  ${({ mx }) =>
    mx !== undefined ? `margin-inline: ${resolveSpacing(mx)}px;` : ""}
  ${({ my }) =>
    my !== undefined ? `margin-block: ${resolveSpacing(my)}px;` : ""}
  min-height: 0;
  min-width: 0;
`;

export default Flex;
