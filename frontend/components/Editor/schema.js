import React from 'react';

const schema = {
  nodes: {
    'block-quote': attrs => <blockquote>{ attrs.children }</blockquote>,
    'bulleted-list': attrs => <ul>{ attrs.children }</ul>,
    'heading1': attrs => <h1>{ attrs.children }</h1>,
    'heading2': attrs => <h2>{ attrs.children }</h2>,
    'heading3': attrs => <h3>{ attrs.children }</h3>,
    'heading4': attrs => <h4>{ attrs.children }</h4>,
    'heading5': attrs => <h5>{ attrs.children }</h5>,
    'heading6': attrs => <h6>{ attrs.children }</h6>,
    'list-item': attrs => <li>{ attrs.children }</li>,
  }
}

export default schema;
