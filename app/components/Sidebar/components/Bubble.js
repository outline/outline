// @flow
import * as React from 'react';
import styled from 'styled-components';
import { fadeAndScaleIn } from 'shared/styles/animations';

type Props = {
  count: number,
};

const Bubble = ({ count }: Props) => {
  return <Count>{count}</Count>;
};

const Count = styled.div`
  animation: ${fadeAndScaleIn} 200ms ease;
  border-radius: 100%;
  color: ${props => props.theme.white};
  background: ${props => props.theme.slateDark};
  display: inline-block;
  font-feature-settings: 'tnum';
  font-weight: 600;
  font-size: 9px;
  line-height: 16px;
  min-width: 16px;
  min-height: 16px;
  text-align: center;
  padding: 0 4px;
  margin-left: 8px;
`;

export default Bubble;
