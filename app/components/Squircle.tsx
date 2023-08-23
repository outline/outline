import * as React from "react";
import styled from "styled-components";
import Flex from "./Flex";

type Props = {
  size?: number;
  color?: string;
  children?: React.ReactNode;
};

const Squircle: React.FC<Props> = ({ color, size = 28, children }: Props) => (
  <Wrapper
    style={{ width: size, height: size }}
    align="center"
    justify="center"
  >
    <svg width={size} height={size} viewBox="0 0 28 28">
      <path
        fill={color}
        d="M0 11.1776C0 1.97285 1.97285 0 11.1776 0H16.8224C26.0272 0 28 1.97285 28 11.1776V16.8224C28 26.0272 26.0272 28 16.8224 28H11.1776C1.97285 28 0 26.0272 0 16.8224V11.1776Z"
      />
    </svg>
    <Content>{children}</Content>
  </Wrapper>
);

const Wrapper = styled(Flex)`
  position: relative;
`;

const Content = styled.div`
  display: flex;
  transform: translate(-50%, -50%);
  position: absolute;
  top: 50%;
  left: 50%;
`;

export default Squircle;
