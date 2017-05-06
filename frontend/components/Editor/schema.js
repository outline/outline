import React from 'react';
import Image from './components/Image';
import Link from './components/Link';
import Heading from './components/Heading';

const schema = {
  marks: {
    bold: props => <strong>{props.children}</strong>,
    code: props => <code>{props.children}</code>,
    italic: props => <em>{props.children}</em>,
    underlined: props => <u>{props.children}</u>,
    deleted: props => <del>{props.children}</del>,
    added: props => <span>{props.children}</span>,
  },

  nodes: {
    paragraph: props => <p>{props.children}</p>,
    'block-quote': props => <blockquote>{props.children}</blockquote>,
    'horizontal-rule': props => <hr />,
    'bulleted-list': props => <ul>{props.children}</ul>,
    'ordered-list': props => <ol>{props.children}</ol>,
    table: props => <table>{props.children}</table>,
    'table-row': props => <tr>{props.children}</tr>,
    'table-head': props => <th>{props.children}</th>,
    'table-cell': props => <td>{props.children}</td>,
    image: Image,
    link: Link,
    heading1: props => <Heading placeholder {...props} />,
    heading2: props => <Heading component="h2" {...props} />,
    heading3: props => <Heading component="h3" {...props} />,
    heading4: props => <Heading component="h4" {...props} />,
    heading5: props => <Heading component="h5" {...props} />,
    heading6: props => <Heading component="h6" {...props} />,
    'list-item': props => <li>{props.children}</li>,
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
