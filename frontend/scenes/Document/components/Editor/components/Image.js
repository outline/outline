// @flow
import React from 'react';
import type { Props } from '../types';

export default function Image({ attributes, node }: Props) {
  return (
    <img
      {...attributes}
      src={node.data.get('src')}
      alt={node.data.get('alt')}
    />
  );
}
