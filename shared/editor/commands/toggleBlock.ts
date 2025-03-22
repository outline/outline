import isNull from "lodash/isNull";
import { NodeType } from "prosemirror-model";
import { Command, TextSelection } from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";

export function liftChildrenUp(type: NodeType): Command {
  return (state, dispatch) => {
    const { $cursor } = state.selection as TextSelection;
    if (!$cursor) {
      return false;
    }
    const parent = $cursor.node($cursor.depth - 1);
    if (parent.type.name !== type.name) {
      return false;
    }

    const start = $cursor.start($cursor.depth - 1);
    if ($cursor.pos !== start + 1) {
      return false;
    }
    const end = $cursor.end($cursor.depth - 1);

    const $start = state.doc.resolve(start);
    const $end = state.doc.resolve(end);
    const range = $start.blockRange($end);
    if (isNull(range)) {
      return false;
    }
    const target = liftTarget(range);
    if (isNull(target)) {
      return false;
    }

    const tr = state.tr;
    tr.lift(range, target);
    if (dispatch) {
      dispatch(tr);
    }
    return true;
  };
}
