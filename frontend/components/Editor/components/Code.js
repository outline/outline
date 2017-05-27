// @flow
import React from 'react';
import type { Props } from '../types';

export default function Code({ children, attributes }: Props) {
  return (
    <pre>
      <code {...attributes}>
        {children}
      </code>
    </pre>
  );
}
