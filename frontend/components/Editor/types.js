import { List } from 'immutable';

export type NodeTransform = {
  addMarkByKey: Function,
  insertNodeByKey: Function,
  insertTextByKey: Function,
  moveNodeByKey: Function,
  removeMarkByKey: Function,
  removeNodeByKey: Function,
  removeTextByKey: Function,
  setMarkByKey: Function,
  setNodeByKey: Function,
  splitNodeByKey: Function,
  unwrapInlineByKey: Function,
  unwrapBlockByKey: Function,
  unwrapNodeByKey: Function,
  wrapBlockByKey: Function,
  wrapInlineByKey: Function,
};

export type StateTransform = {
  deleteBackward: Function,
  deleteForward: Function,
  delete: Function,
  insertBlock: Function,
  insertFragment: Function,
  insertInline: Function,
  insertText: Function,
  addMark: Function,
  setBlock: Function,
  setInline: Function,
  splitBlock: Function,
  splitInline: Function,
  removeMark: Function,
  toggleMark: Function,
  unwrapBlock: Function,
  unwrapInline: Function,
  wrapBlock: Function,
  wrapInline: Function,
  wrapText: Function,
};

export type Transform = NodeTransform & StateTransform;

export type Editor = {
  className: string,
  onChange: Function,
  onDocumentChange: Function,
  onSelectionChange: Function,
  plugins: Array<Object>,
  readOnly: boolean,
  state: Object,
  style: Object,
};

export type Node = {
  key: string,
  kind: string,
  length: number,
  text: string,
  nodes: List<Node>,
  getMarks: Function,
  getBlocks: Function,
  getParent: Function,
  getInlines: Function,
  setBlock: Function,
};

export type Props = {
  node: Node,
  parent: Node,
  editor: Editor,
  readOnly: boolean,
  children: React$Element<any>,
};
