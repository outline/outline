import styled from "styled-components";
import Flex from "../Flex";

interface HStackProps {
  /** The spacing between children in pixels. Defaults to 8. */
  spacing?: number;
  /** The alignment of children along the cross axis. Defaults to "center". */
  align?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
}

/**
 * HStack is a horizontal layout component that stacks its children horizontally with a gap.
 * It is a specialized version of the Flex component.
 */
export const HStack = styled(Flex).attrs<HStackProps>((props) => ({
  align: props.align ?? "center",
  gap: props.spacing ?? 8,
}))<HStackProps>``;

HStack.displayName = "HStack";
