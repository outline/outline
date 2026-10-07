import type { MarkType } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { NodeSelection } from "prosemirror-state";
import type { Primitive } from "utility-types";
import { getMarksBetween } from "./getMarksBetween";
import { getMarkRangeNodeSelection } from "./getMarkRange";

type Options = {
  /** Only return match if the range and attrs is exact */
  exact?: boolean;
  /** If true then mark must contain entire selection */
  inclusive?: boolean;
};

const isNodeMarkActive =
  (type: MarkType) =>
  (state: EditorState): boolean => {
    if (!type) {
      return false;
    }

    const { selection } = state;

    if (!(selection instanceof NodeSelection)) {
      return false;
    }

    const mark = getMarkRangeNodeSelection(selection, type);
    if (!mark) {
      return false;
    }

    return true;
  };

const isInlineMarkActive =
  (type: MarkType, attrs?: Record<string, Primitive>, options?: Options) =>
  (state: EditorState): boolean => {
    if (!type) {
      return false;
    }

    const { from, $from, to, empty } = state.selection;
    const marksAtCursor = state.storedMarks || $from.marks();
    const hasMark = !!(empty
      ? type.isInSet(marksAtCursor)
      : state.doc.rangeHasMark(from, to, type));

    if (!hasMark) {
      return false;
    }
    if (attrs || options) {
      // A cursor covers no range, so the marks that will apply to the text
      // typed there answer the question, and the range options do not apply.
      if (empty) {
        return marksAtCursor.some(
          (mark) =>
            mark.type === type &&
            (!attrs ||
              Object.keys(attrs).every((key) => mark.attrs[key] === attrs[key]))
        );
      }

      const results = getMarksBetween(from, to, state);
      return results.some(
        ({ mark, start, end }) =>
          mark.type === type &&
          (!attrs ||
            Object.keys(attrs).every(
              (key) => mark.attrs[key] === attrs[key]
            )) &&
          (!options?.exact || (start === from && end === to)) &&
          (!options?.inclusive || (start <= from && end >= to))
      );
    }

    return true;
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
  (state: EditorState) =>
    isInlineMarkActive(type, attrs, options)(state) ||
    isNodeMarkActive(type)(state);
