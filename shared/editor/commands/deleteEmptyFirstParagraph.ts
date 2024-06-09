import { Command } from "prosemirror-state";
import { isNodeActive } from "../queries/isNodeActive";

/**
 * Deletes the first paragraph node if it is empty and the cursor is at the
 * beginning of the document.
 */
const deleteEmptyFirstParagraph: Command = (state, dispatch) => {
  if (!isNodeActive(state.schema.nodes.paragraph)(state)) {
    return false;
  }

  if (state.selection.from !== 1 || state.selection.to !== 1) {
    return false;
  }

  const parent = state.selection.$from.parent;
  if (parent.textContent !== "" || parent.childCount > 0) {
    return false;
  }

  // delete the empty paragraph node
  dispatch?.(
    state.tr
      .delete(state.selection.from - 1, state.selection.from)
      .scrollIntoView()
  );
  return true;
};

export default deleteEmptyFirstParagraph;
