import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";

type Props = {
  /** The emoji to render */
  emoji: string;
  /** The size of the emoji, 24px is default to match standard icons */
  size?: number;
  className?: string;
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
  font-family: ${s("fontFamilyEmoji")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  font-size: ${(props) => props.$size - 10}px;
`;
