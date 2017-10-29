// @flow
import React from 'react';
import { Document } from 'slate';
import type { Props } from '../types';
import Placeholder from './Placeholder';

export default function Link({
  attributes,
  editor,
  node,
  parent,
  children,
  readOnly,
}: Props) {
  const parentIsDocument = parent instanceof Document;
  const firstParagraph = parent && parent.nodes.get(1) === node;
  const lastParagraph = parent && parent.nodes.last() === node;
  const showPlaceholder =
    !readOnly &&
    parentIsDocument &&
    firstParagraph &&
    lastParagraph &&
    !node.text;

  return (
    <p>
      {children}
      {showPlaceholder &&
        <Placeholder contentEditable={false}>
          {editor.props.bodyPlaceholder}
        </Placeholder>}
    </p>
  );
}
