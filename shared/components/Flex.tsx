import { CSSProperties } from "react";
import styled from "styled-components";

type JustifyValues = CSSProperties["justifyContent"];

type AlignValues = CSSProperties["alignItems"];

/**
 * Flex is a styled component that provides a flexible box layout with convenient props.
 * It simplifies the use of flexbox CSS properties with a clean, declarative API.
 */
const Flex = styled.div<{
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
  /** Sets gap between flex items in pixels */
  gap?: number;
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
  gap: ${({ gap }) => (gap ? `${gap}px` : "initial")};
  min-height: 0;
  min-width: 0;
`;

export default Flex;
