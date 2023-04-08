import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";

type Props = {
  /** The size to render the indicator, defaults to 24px */
  size?: number;
};

/**
 * A component to show an animated typing indicator.
 */
export default function Typing({ size = 24 }: Props) {
  return (
    <Wrapper height={size} width={size}>
      <Circle cx={size / 4} cy={size / 2} r="2" />
      <Circle cx={size / 2} cy={size / 2} r="2" />
      <Circle cx={size / 1.33333} cy={size / 2} r="2" />
    </Wrapper>
  );
}

const Wrapper = styled.svg`
  fill: ${s("textTertiary")};

  @keyframes blink {
    50% {
      fill: transparent;
    }
  }
`;

const Circle = styled.circle`
  animation: 1s blink infinite;

  &:nth-child(2) {
    animation-delay: 250ms;
  }
  &:nth-child(3) {
    animation-delay: 500ms;
  }
`;
