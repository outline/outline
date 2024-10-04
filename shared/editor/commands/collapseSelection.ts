import { Command, TextSelection } from "prosemirror-state";

/**
 * A prosemirror command to collapse the current selection to a cursor at the start of the selection.
 *
 * @returns A prosemirror command.
 */
export const collapseSelection = (): Command => (state, dispatch) => {
  dispatch?.(
    state.tr.setSelection(
      TextSelection.create(state.doc, state.tr.selection.from)
    )
  );
  return true;
};
