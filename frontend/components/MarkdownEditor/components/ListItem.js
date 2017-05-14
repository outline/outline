// @flow
import React from 'react';
import type { Props } from '../types';
import TodoItem from './TodoItem';

export default function ListItem({ children, node, ...props }: Props) {
  const checked = node.data.get('checked');
  if (checked !== undefined) {
    return (
      <TodoItem checked={checked} node={node} {...props}>
        {children}
      </TodoItem>
    );
  }
  return <li>{children}</li>;
}
