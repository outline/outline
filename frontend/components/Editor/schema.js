import React from 'react';
import Image from './components/Image';
import Link from './components/Link';
import Title from './components/Title';

const schema = {
  marks: {
    bold: props => <strong>{props.children}</strong>,
    code: props => <code>{props.children}</code>,
    italic: props => <em>{props.children}</em>,
    underlined: props => <u>{props.children}</u>,
    strikethrough: props => <del>{props.children}</del>,
  },

  nodes: {
    paragraph: props => <p>{props.children}</p>,
    'block-quote': props => <blockquote>{props.children}</blockquote>,
    'bulleted-list': props => <ul>{props.children}</ul>,
    'ordered-list': props => <ol>{props.children}</ol>,
    image: Image,
    link: Link,
    heading1: Title,
    heading2: props => <h2>{props.children}</h2>,
    heading3: props => <h3>{props.children}</h3>,
    heading4: props => <h4>{props.children}</h4>,
    heading5: props => <h5>{props.children}</h5>,
    heading6: props => <h6>{props.children}</h6>,
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
