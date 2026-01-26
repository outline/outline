import type { Node as ProsemirrorNode, ResolvedPos } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Slice } from "prosemirror-model";
import { toggleFoldPluginKey } from "../nodes/ToggleBlock";
import { ancestors } from "../utils";
import { findParentNodeClosestToPos } from "./findParentNode";

/**
 * Check if a node is a toggle block.
 *
 * @param state - the editor state.
 * @returns a predicate function.
 */
export const isToggleBlock =
  (state: EditorState) =>
  (node: ProsemirrorNode): boolean =>
    node.type === state.schema.nodes.container_toggle;

/**
 * Check if a toggle block is currently folded.
 *
 * @param state - the editor state.
 * @param toggleBlock - the toggle block node to check.
 * @returns true if the toggle block is folded.
 */
export function isToggleBlockFolded(
  state: EditorState,
  toggleBlock: ProsemirrorNode
): boolean {
  const pluginState = toggleFoldPluginKey.getState(state);
  return pluginState?.foldedIds.has(toggleBlock.attrs.id) ?? false;
}

/**
 * Find the depth of a toggle block relative to the selection.
 *
 * @param $pos - the resolved position to search from.
 * @param toggleBlock - the toggle block node to find.
 * @returns the depth of the toggle block, or -1 if not found.
 */
export function getToggleBlockDepth(
  $pos: ResolvedPos,
  toggleBlock: ProsemirrorNode
): number {
  return ancestors($pos).findIndex((node) => node.eq(toggleBlock));
}

/**
 * Find the nearest parent toggle block from a position.
 *
 * @param state - the editor state.
 * @param $pos - the resolved position to search from.
 * @returns the toggle block node and position info, or undefined.
 */
export function findParentToggleBlock(state: EditorState, $pos: ResolvedPos) {
  return findParentNodeClosestToPos($pos, isToggleBlock(state));
}

/**
 * Check if the selection is within a toggle block.
 *
 * @param state - the editor state.
 * @returns true if the selection is within a toggle block.
 */
export function isSelectionInToggleBlock(state: EditorState): boolean {
  return ancestors(state.selection.$from).some(isToggleBlock(state));
}

/**
 * Check if the selection is within the head (first child) of a toggle block.
 *
 * @param state - the editor state.
 * @returns true if the selection is within a toggle block head.
 */
export function isSelectionInToggleBlockHead(state: EditorState): boolean {
  const parent = findParentToggleBlock(state, state.selection.$from);
  if (!parent) {
    return false;
  }
  return state.selection.$from.index(parent.depth) === 0;
}

/**
 * Check if the selection is within the body of a toggle block.
 *
 * @param state - the editor state.
 * @returns true if the selection is within a toggle block body.
 */
export function isSelectionInToggleBlockBody(state: EditorState): boolean {
  return (
    isSelectionInToggleBlock(state) && !isSelectionInToggleBlockHead(state)
  );
}

/**
 * Check if the cursor is at the start of a toggle block head.
 *
 * @param state - the editor state.
 * @returns true if the cursor is at the start of a toggle block head.
 */
export function isSelectionAtStartOfToggleBlockHead(
  state: EditorState
): boolean {
  return (
    isSelectionInToggleBlockHead(state) &&
    state.selection.$from.parentOffset === 0
  );
}

/**
 * Check if the cursor is in the middle of a toggle block head.
 *
 * @param state - the editor state.
 * @returns true if the cursor is in the middle of a toggle block head.
 */
export function isSelectionInMiddleOfToggleBlockHead(
  state: EditorState
): boolean {
  if (!isSelectionInToggleBlockHead(state)) {
    return false;
  }
  const { $from } = state.selection;
  return (
    $from.parentOffset > 0 && $from.parentOffset < $from.node().content.size
  );
}

/**
 * Check if the cursor is at the end of a toggle block head.
 *
 * @param state - the editor state.
 * @returns true if the cursor is at the end of a toggle block head.
 */
export function isSelectionAtEndOfToggleBlockHead(state: EditorState): boolean {
  if (!isSelectionInToggleBlockHead(state)) {
    return false;
  }
  const { $from } = state.selection;
  return $from.parentOffset === $from.node().content.size;
}

/**
 * Result of detaching the body from a toggle block.
 */
export interface DetachBodyResult {
  /** The modified transaction. */
  tr: Transaction;
  /** The detached body content. */
  body: ProsemirrorNode[];
}

/**
 * Detach the body content from a toggle block, returning both the modified
 * transaction and the detached content.
 *
 * @param pos - the position of the toggle block.
 * @param tr - the transaction to modify.
 * @returns the modified transaction and detached body content.
 */
export function detachToggleBlockBody(
  pos: number,
  tr: Transaction
): DetachBodyResult {
  const $start = tr.doc.resolve(pos + 1);
  const toggleBlock = tr.doc.nodeAt(pos);

  const posBeforeBody = $start.pos + toggleBlock!.firstChild!.nodeSize;
  const posAfterBody = $start.end();

  // Extract body content before deleting
  const bodySlice = tr.doc.slice(posBeforeBody, posAfterBody);
  const body: ProsemirrorNode[] = [];
  bodySlice.content.forEach((node) => body.push(node));

  // Delete the body from the document
  const newTr = tr.replace(posBeforeBody, posAfterBody, Slice.empty);

  return { tr: newTr, body };
}

/**
 * Attach body content back to a toggle block.
 *
 * @param pos - the position of the toggle block.
 * @param body - the body content to attach.
 * @param tr - the transaction to modify.
 * @returns the modified transaction.
 */
export function attachToggleBlockBody(
  pos: number,
  body: ProsemirrorNode[],
  tr: Transaction
): Transaction {
  const $start = tr.doc.resolve(pos + 1);
  const toggleBlock = tr.doc.nodeAt(pos);

  const posAfterHead = $start.pos + toggleBlock!.firstChild!.nodeSize;
  return tr.insert(posAfterHead, body);
}
