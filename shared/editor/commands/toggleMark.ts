import { toggleMark as pmToggleMark } from "prosemirror-commands";
import type { MarkType } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import type { Primitive } from "utility-types";
import { chainTransactions } from "../lib/chainTransactions";
import { getMarksBetween } from "../queries/getMarksBetween";
import { isMarkActive } from "../queries/isMarkActive";

const wordCharRegex = /[\p{L}\p{N}_]/u;

const ATOM_PLACEHOLDER = "￼";

/**
 * If the selection is an empty cursor sitting inside a word (with word
 * characters on both sides) in a textblock that allows the given mark type,
 * returns the document positions spanning that word. Returns null otherwise —
 * including when the cursor is at the leading or trailing edge of a word,
 * since intent is ambiguous in those cases.
 */
function findWordRangeAtCursor(
  state: EditorState,
  type: MarkType
): { from: number; to: number } | null {
  const { selection } = state;
  if (!(selection instanceof TextSelection)) {
    return null;
  }
  const $cursor = selection.$cursor;
  if (!$cursor || !$cursor.parent.isTextblock) {
    return null;
  }
  if (!$cursor.parent.type.allowsMarkType(type)) {
    return null;
  }

  const parentStart = $cursor.start();
  const parentEnd = $cursor.end();
  const text = state.doc.textBetween(
    parentStart,
    parentEnd,
    undefined,
    ATOM_PLACEHOLDER
  );
  const offset = $cursor.pos - parentStart;

  const before = offset > 0 ? text[offset - 1] : "";
  const after = offset < text.length ? text[offset] : "";
  if (!wordCharRegex.test(before) || !wordCharRegex.test(after)) {
    return null;
  }

  let start = offset;
  let end = offset;
  while (start > 0 && wordCharRegex.test(text[start - 1])) {
    start--;
  }
  while (end < text.length && wordCharRegex.test(text[end])) {
    end++;
  }

  return { from: parentStart + start, to: parentStart + end };
}

function rangeHasMarkWithAttrs(
  state: EditorState,
  type: MarkType,
  attrs: Record<string, Primitive> | undefined,
  from: number,
  to: number
): boolean {
  if (!state.doc.rangeHasMark(from, to, type)) {
    return false;
  }
  if (!attrs) {
    return true;
  }
  return getMarksBetween(from, to, state).some(
    ({ mark }) =>
      mark.type === type &&
      Object.keys(attrs).every((key) => mark.attrs[key] === attrs[key])
  );
}

/**
 * Toggles a mark on the current selection, if the mark is already with
 * matching attributes it will remove the mark instead, if the mark is active
 * but with different attributes it will update the mark with the new attributes.
 *
 * When invoked with an empty cursor sitting inside a word (with word
 * characters on both sides), the mark is applied to that whole word without
 * altering the user's selection.
 *
 * @param type - The mark type to toggle.
 * @param attrs - The attributes to apply to the mark.
 * @returns A prosemirror command.
 */
export function toggleMark(
  type: MarkType,
  attrs?: Record<string, Primitive>
): Command {
  return (state, dispatch) => {
    const wordRange = findWordRangeAtCursor(state, type);
    if (wordRange) {
      const { from, to } = wordRange;
      const hasMatching = rangeHasMarkWithAttrs(state, type, attrs, from, to);

      if (dispatch) {
        const tr = state.tr.removeMark(from, to, type);
        if (!hasMatching) {
          tr.addMark(from, to, type.create(attrs));
        }
        dispatch(tr);
      }
      return true;
    }

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
