import type { Attrs } from "prosemirror-model";
import {
  TextSelection,
  type Command,
  type Transaction,
} from "prosemirror-state";
import { getMarkRange } from "../queries/getMarkRange";

const createTextHighlight = (attrs: Attrs, tr: Transaction): Transaction => {
  tr = tr.addMark(
    tr.selection.from,
    tr.selection.to,
    tr.selection.$from.doc.type.schema.marks.highlight.create(attrs)
  );

  return tr;
};

const updateTextHighlight = (attrs: Attrs, tr: Transaction): Transaction => {
  const highlightRange = getMarkRange(
    tr.selection.$from,
    tr.selection.$from.doc.type.schema.marks.highlight
  );

  if (highlightRange) {
    tr = tr
      .removeMark(
        highlightRange.from,
        highlightRange.to,
        tr.selection.$from.doc.type.schema.marks.highlight
      )
      .addMark(
        highlightRange.from,
        highlightRange.to,
        tr.selection.$from.doc.type.schema.marks.highlight.create(attrs)
      );
  }

  return tr;
};

const removeTextHighlight = (tr: Transaction) => {
  const highlightRange = getMarkRange(
    tr.selection.$from,
    tr.selection.$from.doc.type.schema.marks.highlight
  );

  if (highlightRange) {
    tr = tr.removeMark(
      highlightRange.from,
      highlightRange.to,
      highlightRange.mark
    );
  }

  return tr;
};

const toggleHighlightTextSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof TextSelection)) {
      return false;
    }

    const highlighted = getMarkRange(
      state.selection.$from,
      state.schema.marks.highlight
    );
    let tr = state.tr;
    if (!highlighted) {
      tr = createTextHighlight(attrs, tr);
    } else if (highlighted && attrs.color) {
      tr = updateTextHighlight(attrs, tr);
    } else {
      tr = removeTextHighlight(tr);
    }

    dispatch?.(tr.setSelection(TextSelection.near(tr.selection.$to)));
    return true;
  };

export const toggleHighlight = (attrs: Attrs): Command =>
  toggleHighlightTextSelection(attrs);
