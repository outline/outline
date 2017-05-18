// @flow
import React from 'react';
import _ from 'lodash';
import slug from 'slug';
import type { Node, Editor } from '../types';
import styles from '../Editor.scss';

type Props = {
  children: React$Element<any>,
  placeholder?: boolean,
  parent: Node,
  node: Node,
  editor: Editor,
  readOnly: boolean,
  component?: string,
};

export default function Heading({
  parent,
  placeholder,
  node,
  editor,
  readOnly,
  children,
  component = 'h1',
}: Props) {
  const firstHeading = parent.nodes.first() === node;
  const showPlaceholder = placeholder && firstHeading && !node.text;
  const slugish = readOnly && _.escape(`${component}-${slug(node.text)}`);
  const Component = component;

  return (
    <Component className={styles.title}>
      {children}
      {showPlaceholder &&
        <span className={styles.placeholder}>
          {editor.props.placeholder}
        </span>}
      {slugish &&
        <a name={slugish} className={styles.anchor} href={`#${slugish}`}>#</a>}
    </Component>
  );
}
