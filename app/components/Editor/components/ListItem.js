// @flow
import React from 'react';
import type { props } from 'slate-prop-types';
import TodoItem from './TodoItem';

export default function ListItem({
  children,
  node,
  attributes,
  ...props
}: props) {
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
