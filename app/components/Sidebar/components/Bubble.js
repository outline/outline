// @flow
import * as React from 'react';
import styled from 'styled-components';
import { fadeAndScaleIn } from 'shared/styles/animations';

type Props = {
  count: number,
};

const Bubble = ({ count }: Props) => {
  return !!count && <Wrapper>{count}</Wrapper>;
};

const Wrapper = styled.div`
  animation: ${fadeAndScaleIn} 200ms ease;

  border-radius: 100%;
  color: ${props => props.theme.white};
  background: ${props => props.theme.slateDark};
  display: inline-block;
  font-feature-settings: "tnum";
  font-weight: 500;
  font-size: 10px;
  min-width: 15px;
  padding: 0 4px;
  position: relative;
  top: -2px;
  left: 2px;
}

`;

export default Bubble;
