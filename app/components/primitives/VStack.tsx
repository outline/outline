import type { CSSProperties } from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";

interface VStackProps {
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
 * VStack is a vertical layout component that stacks its children vertically with a gap.
 */
export const VStack = styled(Flex)
  .withConfig({
    shouldForwardProp: (prop) => !["spacing"].includes(prop),
  })
  .attrs<VStackProps>((props) => ({
    column: true,
    align: props.align ?? "center",
    gap: props.spacing !== undefined ? props.spacing : 8,
  }))<VStackProps>``;

VStack.displayName = "VStack";
