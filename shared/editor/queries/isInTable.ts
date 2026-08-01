import type { EditorState } from "prosemirror-state";

type Options = {
  /** Only consider tables nested deeper than this ancestor depth. */
  below?: number;
};

/**
 * Check if the current selection is in a table.
 *
 * @param state - The current editor state
 * @param options - Optionally restrict which ancestor depths are considered
 * @returns True if the selection is inside a table.
 */
export function isInTable(state: EditorState, options?: Options): boolean {
  const $head = state.selection.$head;
  const min = options?.below !== undefined ? options.below + 1 : 1;

  for (let d = $head.depth; d >= min; d--) {
    if ($head.node(d).type.spec.tableRole === "table") {
      return true;
    }
  }

  return false;
}
