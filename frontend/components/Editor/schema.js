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
  },

  nodes: {
    'block-quote': props => <blockquote>{props.children}</blockquote>,
    'bulleted-list': props => <ul>{props.children}</ul>,
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
  ],
};

export default schema;
