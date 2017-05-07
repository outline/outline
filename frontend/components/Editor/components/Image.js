// @flow
import React from 'react';

type Props = {
  attributes: Object,
  node: Object,
};

export default function Image({ attributes, node }: Props) {
  return (
    <img
      {...attributes}
      src={node.data.get('src')}
      alt={node.data.get('alt')}
    />
  );
}
