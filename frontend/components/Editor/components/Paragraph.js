// @flow
import React from 'react';
import { Document } from 'slate';
import type { Props } from '../types';
import styles from '../Editor.scss';

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
        <span className={styles.placeholder} contentEditable={false}>
          {editor.props.bodyPlaceholder}
        </span>}
    </p>
  );
}
