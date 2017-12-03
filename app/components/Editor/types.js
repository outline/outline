// @flow
import { Value, Node } from 'slate';
import { Editor } from 'slate-react';

export type SlateNodeProps = {
  children: React$Element<*>,
  readOnly: boolean,
  attributes: Object,
  value: Value,
  editor: Editor,
  node: Node,
  parent: Node,
};
