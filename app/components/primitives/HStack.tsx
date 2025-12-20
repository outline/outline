import type { CSSProperties } from "react";
import styled from "styled-components";

interface HStackProps {
  /** The spacing between children in pixels. Defaults to 8. */
  spacing?: number;
  /** The alignment of children along the cross axis. Defaults to "center". */
  align?: CSSProperties["alignItems"];
  /** The justification of children along the main axis. */
  justify?: CSSProperties["justifyContent"];
  /** Makes the component grow to fill available space. */
  auto?: boolean;
  /** Whether the children should wrap. */
  wrap?: boolean;
}

/**
 * HStack is a horizontal layout component that stacks its children horizontally with a gap.
 */
export const HStack = styled.div.withConfig({
  shouldForwardProp: (prop) =>
    !["spacing", "align", "justify", "auto", "wrap"].includes(prop),
})<HStackProps>`
  display: flex;
  flex-direction: row;
  flex: ${({ auto }) => (auto ? "1 1 auto" : "initial")};
  align-items: ${({ align }) => align ?? "center"};
  justify-content: ${({ justify }) => justify};
  flex-wrap: ${({ wrap }) => (wrap ? "wrap" : "nowrap")};
  gap: ${({ spacing }) => (spacing !== undefined ? `${spacing}px` : "8px")};
`;

HStack.displayName = "HStack";
