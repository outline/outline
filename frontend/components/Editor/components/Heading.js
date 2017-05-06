// @flow
import React from 'react';
import escape from 'lodash/escape';
import slug from 'slug';
import styles from '../Editor.scss';

type Props = {
  children: any,
  placeholder: boolean,
  parent: Object,
  node: Object,
  editor: Object,
  readOnly: boolean,
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
  const slugish = readOnly && escape(`${component}-${slug(node.text)}`);
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
