// @flow
import React from 'react';
import type { Props } from '../types';
import TodoItem from './TodoItem';

export default function ListItem({ children, editor, node }: Props) {
  const checked = node.data.get('checked');
  if (checked !== undefined) {
    return (
      <TodoItem checked={checked} node={node} editor={editor}>
        {children}
      </TodoItem>
    );
  }
  return <li>{children}</li>;
}
