import * as React from "react";
import styled, { DefaultTheme } from "styled-components";

/**
 * Props for the DropCursor component
 * @interface Props
 * @property {boolean} isActiveDrop - Whether the cursor is currently over a valid drop target
 * @property {React.Ref<HTMLDivElement>} innerRef - Ref for the drop target element
 * @property {"top"} [position] - Optional position override, currently only supports "top"
 * @property {number} [depth] - Nesting depth for visual indentation (default: 0)
 */
type Props = {
  isActiveDrop: boolean;
  innerRef: React.Ref<HTMLDivElement>;
  position?: "top";
  depth?: number;
};

/**
 * Styled component props interface
 */
interface CursorProps {
  isOver?: boolean;
  position?: "top";
  depth: number;
  theme: DefaultTheme;
}

/**
 * DropCursor component provides visual feedback during drag operations.
 * It shows a thin line indicating where an item will be dropped.
 * The cursor's appearance changes based on:
 * - Whether it's over a valid drop target (opacity)
 * - The nesting depth of the target (indentation)
 * - The position of the target (top/bottom)
 * 
 * @param {Props} props - Component props
 * @returns {JSX.Element} A styled drop cursor element
 */
function DropCursor({ isActiveDrop, innerRef, position, depth = 0 }: Props) {
  return (
    <Cursor
      isOver={isActiveDrop}
      ref={innerRef}
      position={position}
      depth={depth}
    />
  );
}

/**
 * Styled component for the drop cursor.
 * Creates a transparent hover zone with a thin visible band vertically centered.
 * The cursor's appearance is controlled by:
 * - isOver: Controls opacity (0 when inactive, 1 when active)
 * - position: Controls vertical positioning (top or bottom)
 * - depth: Controls horizontal indentation based on nesting level
 */
const Cursor = styled.div<CursorProps>`
  opacity: ${(props: CursorProps) => (props.isOver ? 1 : 0)};
  transition: opacity 150ms;
  position: absolute;
  z-index: 1;

  width: 100%;
  height: 14px;
  background: transparent;
  ${(props: CursorProps) => (props.position === "top" ? "top: -7px;" : "bottom: -7px;")}

  ::after {
    background: ${(props: CursorProps) => props.theme.slateDark};
    position: absolute;
    top: 6px;
    content: "";
    height: 2px;
    border-radius: 2px;
    width: 100%;
    // Indent based on nesting depth, with a maximum of 24px
    margin-left: ${(props: CursorProps) => Math.min(props.depth * 8, 24)}px;
    width: ${(props: CursorProps) => `calc(100% - ${Math.min(props.depth * 8, 24)}px)`};
    // Add subtle shadow for better visibility
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
  }
`;

export default DropCursor;
