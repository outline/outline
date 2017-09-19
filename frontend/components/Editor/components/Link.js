// @flow
import React from 'react';
import type { Props } from '../types';

export default function Link({ attributes, node, children }: Props) {
  return (
    <a {...attributes} href={node.data.get('href')} target="_blank">
      {children}
    </a>
  );
}
