import * as React from "react";
import styled from "styled-components";
import Flex from "./Flex";

type Props = {
  /** The width and height of the squircle */
  size?: number;
  /** The color of the squircle */
  color?: string;
  children?: React.ReactNode;
  className?: string;
};

const Squircle: React.FC<Props> = ({
  color,
  size = 28,
  children,
  className,
}: Props) => (
  <Wrapper size={size} align="center" justify="center" className={className}>
    <svg width={size} height={size} fill={color} viewBox="0 0 28 28">
      <path d="M0 11.1776C0 1.97285 1.97285 0 11.1776 0H16.8224C26.0272 0 28 1.97285 28 11.1776V16.8224C28 26.0272 26.0272 28 16.8224 28H11.1776C1.97285 28 0 26.0272 0 16.8224V11.1776Z" />
    </svg>
    <Content>{children}</Content>
  </Wrapper>
);

const Wrapper = styled(Flex)<{ size: number }>`
  position: relative;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;

  svg {
    transition: fill 150ms ease-in-out;
    transition-delay: var(--delay);
  }
`;

const Content = styled.div`
  display: flex;
  transform: translate(-50%, -50%);
  position: absolute;
  top: 50%;
  left: 50%;
`;

export default Squircle;
