// @flow
import React from 'react';
import type { Props } from '../types';
import { color } from 'styles/constants';
import styled from 'styled-components';

const StyledImg = styled.img`
  box-shadow: ${props => (props.active ? `0 0 0 3px ${color.slate}` : '0')};
  opacity: ${props => (props.loading ? 0.5 : 1)};
`;

export default function Image({ attributes, state, node }: Props) {
  const loading = node.data.get('loading');
  const alt = node.data.get('alt');
  const src = node.data.get('src');
  const active = state.isFocused && state.selection.hasEdgeIn(node);

  return (
    <StyledImg
      {...attributes}
      src={src}
      alt={alt}
      active={active}
      loading={loading}
    />
  );
}
