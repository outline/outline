import { MarkType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Primitive } from "utility-types";
import { getMarksBetween } from "./getMarksBetween";

type Options = {
  /** Only return match if the range and attrs is exact */
  exact?: boolean;
};

/**
 * Checks if a mark is active in the current selection or not.
 *
 * @param type The mark type to check.
 * @param attrs The attributes to check.
 * @param options The options to use.
 * @returns A function that checks if a mark is active in the current selection or not.
 */
export const isMarkActive =
  (type: MarkType, attrs?: Record<string, Primitive>, options?: Options) =>
  (state: EditorState): boolean => {
    if (!type) {
      return false;
    }

    const { from, $from, to, empty } = state.selection;
    const hasMark = !!(empty
      ? type.isInSet(state.storedMarks || $from.marks())
      : state.doc.rangeHasMark(from, to, type));

    if (!hasMark) {
      return false;
    }
    if (attrs || options) {
      const results = getMarksBetween(from, to, state);
      return results.some(
        ({ mark, start, end }) =>
          mark.type === type &&
          (!attrs ||
            Object.keys(attrs).every(
              (key) => mark.attrs[key] === attrs[key]
            )) &&
          (!options?.exact || (start === from && end === to))
      );
    }

    return true;
  };
