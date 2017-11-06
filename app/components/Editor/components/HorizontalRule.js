// @flow
import React from 'react';
import styled from 'styled-components';
import type { Props } from '../types';
import { color } from 'shared/styles/constants';

function HorizontalRule(props: Props) {
  const { state, node } = props;
  const active = state.isFocused && state.selection.hasEdgeIn(node);
  return <StyledHr active={active} />;
}

const StyledHr = styled.hr`
  border: 0;
  border-bottom: 1px solid ${props => (props.active ? color.slate : color.slateLight)};
`;

export default HorizontalRule;
