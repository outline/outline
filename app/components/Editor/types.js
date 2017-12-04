// @flow
import { Value, Change, Node } from 'slate';
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

export type Plugin = {
  validateNode?: Node => *,
  onClick?: SyntheticEvent => *,
  onKeyDown?: (SyntheticKeyboardEvent, Change) => *,
};
