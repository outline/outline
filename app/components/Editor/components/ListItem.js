// @flow
import React from 'react';
import type { Props } from '../types';
import TodoItem from './TodoItem';

export default function ListItem({ children, node, attributes }: Props) {
  const checked = node.data.get('checked');

  if (checked !== undefined) {
    return (
      <TodoItem checked={checked} node={node} {...attributes}>
        {children}
      </TodoItem>
    );
  }
  return <li {...attributes}>{children}</li>;
}
