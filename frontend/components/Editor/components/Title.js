import React from 'react';
import styles from '../Editor.scss';

export default function Title(props) {
  const firstHeading = props.parent.nodes.first() === props.node;
  const showPlaceholder = !props.node.text && firstHeading;

  return (
    <h1 className={styles.title}>
      {props.children}
      {showPlaceholder &&
        <span className={styles.placeholder}>
          {props.editor.props.placeholder}
        </span>}
    </h1>
  );
}
