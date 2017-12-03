// @flow
import React from 'react';
import InlineCode from './components/InlineCode';
import type { props } from 'slate-prop-types';

export default function renderMark(props: props) {
  switch (props.mark.type) {
    case 'bold':
      return <strong>{props.children}</strong>;
    case 'code':
      return <InlineCode>{props.children}</InlineCode>;
    case 'italic':
      return <em>{props.children}</em>;
    case 'underlined':
      return <u>{props.children}</u>;
    case 'deleted':
      return <del>{props.children}</del>;
    case 'added':
      return <mark>{props.children}</mark>;
    default:
  }
}
