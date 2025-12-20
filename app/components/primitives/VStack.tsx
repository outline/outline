import styled from "styled-components";
import Flex from "../Flex";

interface VStackProps {
  /** The spacing between children in pixels. Defaults to 8. */
  spacing?: number;
  /** The alignment of children along the cross axis. Defaults to "center". */
  align?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
}

/**
 * VStack is a vertical layout component that stacks its children vertically with a gap.
 * It is a specialized version of the Flex component with flex-direction: column.
 */
export const VStack = styled(Flex).attrs<VStackProps>((props) => ({
  column: true,
  align: props.align ?? "center",
  gap: props.spacing ?? 8,
}))<VStackProps>`
  width: 100%;
`;

VStack.displayName = "VStack";
