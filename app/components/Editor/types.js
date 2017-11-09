// @flow
import { List, Set, Map } from 'immutable';
import { Selection } from 'slate';

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

export type SelectionTransform = {
  collapseToStart: Function,
  collapseToEnd: Function,
};

export type Transform = NodeTransform & StateTransform & SelectionTransform;

export type Editor = {
  props: Object,
  className: string,
  onChange: Function,
  onDocumentChange: Function,
  onSelectionChange: Function,
  plugins: Array<Object>,
  readOnly: boolean,
  state: Object,
  style: Object,
  placeholder?: string,
  placeholderClassName?: string,
  placeholderStyle?: string,
  blur: Function,
  focus: Function,
  getSchema: Function,
  getState: Function,
};

export type Node = {
  key: string,
  kind: string,
  type: string,
  length: number,
  text: string,
  data: Map<string, any>,
  nodes: List<Node>,
  getMarks: Function,
  getBlocks: Function,
  getParent: Function,
  getInlines: Function,
  getInlinesAtRange: Function,
  setBlock: Function,
};

export type Block = Node & {
  type: string,
};

export type Document = Node;

export type State = {
  document: Document,
  selection: Selection,
  startBlock: Block,
  endBlock: Block,
  startText: Node,
  endText: Node,
  marks: Set<*>,
  blocks: List<Block>,
  fragment: Document,
  lines: List<Node>,
  tests: List<Node>,
  startBlock: Block,
  transform: Function,
  isBlurred: Function,
};

export type Props = {
  node: Node,
  parent?: Node,
  attributes?: Object,
  state: State,
  editor: Editor,
  readOnly?: boolean,
  children?: React$Element<any>,
};
