import { toggleMark as pmToggleMark } from "prosemirror-commands";
import { MarkType } from "prosemirror-model";
import { Command } from "prosemirror-state";
import { Primitive } from "utility-types";
import { chainTransactions } from "../lib/chainTransactions";
import { isMarkActive } from "../queries/isMarkActive";

/**
 * Toggles a mark on the current selection, if the mark is already with
 * matching attributes it will remove the mark instead, if the mark is active
 * but with different attributes it will update the mark with the new attributes.
 *
 * @param type - The mark type to toggle.
 * @param attrs - The attributes to apply to the mark.
 * @returns A prosemirror command.
 */
export function toggleMark(
  type: MarkType,
  attrs: Record<string, Primitive> | undefined
): Command {
  return (state, dispatch) => {
    if (isMarkActive(type, attrs)(state)) {
      return pmToggleMark(type)(state, dispatch);
    }

    if (isMarkActive(type)(state)) {
      return chainTransactions(pmToggleMark(type), pmToggleMark(type, attrs))(
        state,
        dispatch
      );
    }

    return pmToggleMark(type, attrs)(state, dispatch);
  };
}
