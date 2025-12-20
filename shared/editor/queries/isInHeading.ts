import type { EditorState } from "prosemirror-state";
import { isNodeActive } from "./isNodeActive";

/**
 * Returns true if the selection is inside a heading node.
 *
 * @param state The editor state.
 * @returns True if the selection is inside a heading node.
 */
export function isInHeading(state: EditorState): boolean {
  const { nodes } = state.schema;

  if (nodes.heading && isNodeActive(nodes.heading)(state)) {
    return true;
  }

  return false;
}
