import { EditorState } from "prosemirror-state";
import { isNodeActive } from "./isNodeActive";

/**
 * Returns true if the selection is inside a notice block.
 *
 * @param state The editor state.
 * @returns True if the selection is inside a notice block.
 */
export function isInNotice(state: EditorState): boolean {
  const { nodes } = state.schema;
  return nodes.container_notice && isNodeActive(nodes.container_notice)(state);
}
