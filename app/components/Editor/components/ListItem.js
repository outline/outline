// @flow
import React from 'react';
import type { Props } from '../types';
import TodoItem from './TodoItem';

export default function ListItem({
  children,
  node,
  attributes,
  ...props
}: Props) {
  const checked = node.data.get('checked');

  if (checked !== undefined) {
    return (
      <TodoItem
        checked={checked}
        node={node}
        attributes={attributes}
        {...props}
      >
        {children}
      </TodoItem>
    );
  }
  return <li {...attributes}>{children}</li>;
}
