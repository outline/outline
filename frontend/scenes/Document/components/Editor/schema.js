// @flow
import React from 'react';
import Code from './components/Code';
import Image from './components/Image';
import Link from './components/Link';
import ListItem from './components/ListItem';
import Heading from './components/Heading';
import type { Props, Node, Transform } from './types';
import styles from './Editor.scss';

const schema = {
  marks: {
    bold: (props: Props) => <strong>{props.children}</strong>,
    code: (props: Props) => <code>{props.children}</code>,
    italic: (props: Props) => <em>{props.children}</em>,
    underlined: (props: Props) => <u>{props.children}</u>,
    deleted: (props: Props) => <del>{props.children}</del>,
    added: (props: Props) => <mark>{props.children}</mark>,
  },

  nodes: {
    paragraph: (props: Props) => <p>{props.children}</p>,
    'block-quote': (props: Props) => <blockquote>{props.children}</blockquote>,
    'horizontal-rule': (props: Props) => <hr />,
    'bulleted-list': (props: Props) => <ul>{props.children}</ul>,
    'ordered-list': (props: Props) => <ol>{props.children}</ol>,
    'todo-list': (props: Props) => (
      <ul className={styles.todoList}>{props.children}</ul>
    ),
    table: (props: Props) => <table>{props.children}</table>,
    'table-row': (props: Props) => <tr>{props.children}</tr>,
    'table-head': (props: Props) => <th>{props.children}</th>,
    'table-cell': (props: Props) => <td>{props.children}</td>,
    code: Code,
    image: Image,
    link: Link,
    'list-item': ListItem,
    heading1: (props: Props) => <Heading placeholder {...props} />,
    heading2: (props: Props) => <Heading component="h2" {...props} />,
    heading3: (props: Props) => <Heading component="h3" {...props} />,
    heading4: (props: Props) => <Heading component="h4" {...props} />,
    heading5: (props: Props) => <Heading component="h5" {...props} />,
    heading6: (props: Props) => <Heading component="h6" {...props} />,
  },

  rules: [
    // ensure first node is a heading
    {
      match: (node: Node) => {
        return node.kind === 'document';
      },
      validate: (document: Node) => {
        const firstNode = document.nodes.first();
        return firstNode && firstNode.type === 'heading1' ? null : firstNode;
      },
      normalize: (transform: Transform, document: Node, firstNode: Node) => {
        transform.setBlock({ type: 'heading1' });
      },
    },

    // remove any marks in first heading
    {
      match: (node: Node) => {
        return node.kind === 'heading1';
      },
      validate: (heading: Node) => {
        const hasMarks = heading.getMarks().isEmpty();
        const hasInlines = heading.getInlines().isEmpty();

        return !(hasMarks && hasInlines);
      },
      normalize: (transform: Transform, heading: Node) => {
        transform.unwrapInlineByKey(heading.key);

        heading.getMarks().forEach(mark => {
          heading.nodes.forEach(textNode => {
            if (textNode.kind === 'text') {
              transform.removeMarkByKey(
                textNode.key,
                0,
                textNode.text.length,
                mark
              );
            }
          });
        });

        return transform;
      },
    },
  ],
};

export default schema;
