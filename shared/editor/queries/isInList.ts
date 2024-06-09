import { EditorState } from "prosemirror-state";

/**
 * Check if the current selection is in a list
 *
 * @param state - The current editor state
 * @param options - Optionally check for specific list types
 */
export function isInList(state: EditorState, options?: { types: string[] }) {
  const $head = state.selection.$head;
  for (let d = $head.depth; d > 0; d--) {
    if (
      (options?.types
        ? options.types
        : ["ordered_list", "bullet_list", "checkbox_list"]
      ).includes($head.node(d).type.name)
    ) {
      return true;
    }
  }

  return false;
}
