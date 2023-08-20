import { EditorState } from "prosemirror-state";
import isMarkActive from "./isMarkActive";

/**
 * Returns true if the selection is inside a code block or code mark.
 *
 * @param state The editor state.
 * @returns True if the selection is inside a code block or code mark.
 */
export default function isInCode(state: EditorState): boolean {
  const { nodes, marks } = state.schema;

  if (nodes.code_block || nodes.code_fence) {
    const $head = state.selection.$head;
    for (let d = $head.depth; d > 0; d--) {
      if (nodes.code_block && $head.node(d).type === nodes.code_block) {
        return true;
      }
      if (nodes.code_fence && $head.node(d).type === nodes.code_fence) {
        return true;
      }
    }
  }

  if (marks.code_inline) {
    return isMarkActive(marks.code_inline)(state);
  }

  return false;
}
