import type { Node } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";

/**
 * Gets the current block node that contains the selection
 * @param state The editor state
 * @returns The current block node and its position, or undefined if not found
 */
export function getCurrentBlock(
  state: EditorState
): [Node, number] | undefined {
  const { $head } = state.selection;

  // Walk up the tree to find the first block node
  for (let d = $head.depth; d > 0; d--) {
    const node = $head.node(d);
    if (node.isBlock) {
      return [node, $head.before(d)];
    }
  }

  return undefined;
}
