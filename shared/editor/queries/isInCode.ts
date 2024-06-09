import { EditorState } from "prosemirror-state";
import { isMarkActive } from "./isMarkActive";
import { isNodeActive } from "./isNodeActive";

type Options = {
  /** Only check if the selection is inside a code block. */
  onlyBlock?: boolean;
  /** Only check if the selection is inside a code mark. */
  onlyMark?: boolean;
};

/**
 * Returns true if the selection is inside a code block or code mark.
 *
 * @param state The editor state.
 * @param options The options.
 * @returns True if the selection is inside a code block or code mark.
 */
export function isInCode(state: EditorState, options?: Options): boolean {
  const { nodes, marks } = state.schema;

  if (!options?.onlyMark) {
    if (nodes.code_block && isNodeActive(nodes.code_block)(state)) {
      return true;
    }
    if (nodes.code_fence && isNodeActive(nodes.code_fence)(state)) {
      return true;
    }
  }

  if (!options?.onlyBlock) {
    if (marks.code_inline) {
      return isMarkActive(marks.code_inline)(state);
    }
  }

  return false;
}
