// @flow
import * as React from "react";
import styled from "styled-components";
import { bounceIn } from "shared/styles/animations";

type Props = {
  count: number,
};

const Bubble = ({ count }: Props) => {
  return <Count>{count}</Count>;
};

const Count = styled.div`
  animation: ${bounceIn} 600ms;
  transform-origin: center center;
  color: ${(props) => props.theme.white};
  background: ${(props) => props.theme.slateDark};
  display: inline-block;
  font-feature-settings: "tnum";
  font-weight: 600;
  font-size: 9px;
  white-space: nowrap;
  vertical-align: baseline;
  min-width: 16px;
  min-height: 16px;
  line-height: 16px;
  border-radius: 8px;
  text-align: center;
  padding: 0 4px;
  margin-left: 8px;
  user-select: none;
`;

export default Bubble;
