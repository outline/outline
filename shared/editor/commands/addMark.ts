import { Attrs, MarkType } from "prosemirror-model";
import { Command } from "prosemirror-state";

/**
 * A prosemirror command to create a mark at the current selection.
 *
 * @returns A prosemirror command.
 */
export const addMark =
  (type: MarkType, attrs?: Attrs | null): Command =>
  (state, dispatch) => {
    dispatch?.(
      state.tr.addMark(
        state.selection.from,
        state.selection.to,
        type.create(attrs)
      )
    );
    return true;
  };
