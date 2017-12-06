// @flow
import React from 'react';
import Code from './components/InlineCode';
import { Mark } from 'slate';

type Props = {
  children: React$Element<*>,
  mark: Mark,
};

export default function renderMark(props: Props) {
  switch (props.mark.type) {
    case 'bold':
      return <strong>{props.children}</strong>;
    case 'code':
      return <Code>{props.children}</Code>;
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
