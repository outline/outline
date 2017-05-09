// @flow
import React from 'react';
import Image from './components/Image';
import Link from './components/Link';
import Heading from './components/Heading';

type Props = {
  node: Object,
  parent: Object,
  editor: Object,
  readOnly: boolean,
  children: React$Element<any>,
};

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
    table: (props: Props) => <table>{props.children}</table>,
    'table-row': (props: Props) => <tr>{props.children}</tr>,
    'table-head': (props: Props) => <th>{props.children}</th>,
    'table-cell': (props: Props) => <td>{props.children}</td>,
    image: Image,
    link: Link,
    heading1: (props: Props) => <Heading placeholder {...props} />,
    heading2: (props: Props) => <Heading component="h2" {...props} />,
    heading3: (props: Props) => <Heading component="h3" {...props} />,
    heading4: (props: Props) => <Heading component="h4" {...props} />,
    heading5: (props: Props) => <Heading component="h5" {...props} />,
    heading6: (props: Props) => <Heading component="h6" {...props} />,
    'list-item': (props: Props) => <li>{props.children}</li>,
  },

  rules: [
    // ensure first node is a heading
    {
      match: node => {
        return node.kind === 'document';
      },
      validate: document => {
        const firstNode = document.nodes.first();
        return firstNode && firstNode.type === 'heading1' ? null : firstNode;
      },
      normalize: (transform, document, firstNode) => {
        transform.setBlock({ type: 'heading1' });
      },
    },

    // remove any marks in first heading
    {
      match: node => {
        return node.type === 'heading1';
      },
      validate: heading => {
        const hasMarks = heading.getMarks().isEmpty();
        const hasInlines = heading.getInlines().isEmpty();

        return !(hasMarks && hasInlines);
      },
      normalize: (transform, heading) => {
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
