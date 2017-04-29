import React from 'react';

export default function Link(props) {
  return (
    <a {...props.attributes} href={props.node.data.get('href')}>
      {props.children}
    </a>
  );
}
