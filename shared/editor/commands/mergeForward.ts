import { Command } from "prosemirror-state";
import { joinPoint } from "prosemirror-transform";

/**
 * A prosemirror command that joins the current list item with the next one
 *
 * @returns A prosemirror command.
 */
export default function mergeForward(): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    const point = joinPoint(state.doc, $from.pos, 1);

    if (point === null || point === undefined) {
      return false;
    }

    const tr = state.tr.join(point, 2);

    if (dispatch) {
      dispatch(tr);
    }

    return true;
  };
}
