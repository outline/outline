// @flow
import React from 'react';
import type { Props } from '../types';
import styled from 'styled-components';

const LoadingImage = styled.img`
  opacity: .5;
`;

export default function Image({ attributes, node }: Props) {
  const loading = node.data.get('loading');
  const Component = loading ? LoadingImage : 'img';
  const src = node.data.get('inlineSrc') || node.data.get('src');

  return <Component {...attributes} src={src} alt={node.data.get('alt')} />;
}
