// @flow
import React from 'react';
import type { SlateNodeProps } from '../types';
import TodoItem from './TodoItem';

export default function ListItem({
  children,
  node,
  attributes,
  ...props
}: SlateNodeProps) {
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
