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
      <SVG size={size} emoji={emoji} />
    </Span>
  );
}

const Span = styled.span<{ $size: number }>`
  font-family: ${s("fontFamilyEmoji")};
  display: inline-block;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
`;

const SVG = ({ size, emoji }: { size: number; emoji: string }) => (
  <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <text
      x="50%"
      y={"55%"}
      dominantBaseline="middle"
      textAnchor="middle"
      fontSize={size * 0.7}
    >
      {emoji}
    </text>
  </svg>
);
