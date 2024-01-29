import * as React from "react";
import styled from "styled-components";

type Props = {
  /** The emoji to render */
  emoji: string;
  /** The size of the emoji, 24px is default to match standard icons */
  size?: number;
};

/**
 * EmojiIcon is a component that renders an emoji in the size of a standard icon
 * in a way that can be used wherever an Icon would be.
 */
export default function EmojiIcon({ size = 24, emoji, ...rest }: Props) {
  return (
    <Span $size={size} {...rest}>
      {emoji}
    </Span>
  );
}

const Span = styled.span<{ $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex-shrink: 0;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  text-indent: -0.15em;
  font-size: ${(props) => props.$size - 10}px;
`;
