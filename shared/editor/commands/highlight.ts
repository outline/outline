import { chainCommands } from "prosemirror-commands";
import { Attrs, Node } from "prosemirror-model";
import {
  Command,
  Selection,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import { getMarkRange } from "../queries/getMarkRange";
import { NodeMarkAttr } from "@shared/editor/types";
import { CellSelection } from "prosemirror-tables";

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

const createCellHighlight = (
  cell: Node,
  pos: number,
  attrs: Attrs,
  tr: Transaction
): Transaction => {
  const existingMarks = cell.attrs.marks ?? [];
  const newMark = {
    type: "highlight",
    attrs,
  };
  const updatedMarks = [...existingMarks, newMark];
  return tr.setNodeAttribute(pos, "marks", updatedMarks);
};

const updateCellHighlight = (
  cell: Node,
  pos: number,
  attrs: Attrs,
  tr: Transaction
): Transaction => {
  const existingMarks = cell.attrs.marks ?? [];
  const updatedMarks = existingMarks.map((mark: NodeMarkAttr) =>
    mark.type === "highlight"
      ? { ...mark, attrs: { ...mark.attrs, ...attrs } }
      : mark
  );
  return tr.setNodeAttribute(pos, "marks", updatedMarks);
};

const removeCellHighlight = (
  cell: Node,
  pos: number,
  tr: Transaction
): Transaction => {
  const existingMarks = cell.attrs.marks ?? [];
  const updatedMarks = existingMarks.filter(
    (mark: NodeMarkAttr) => mark.type !== "highlight"
  );
  return tr.setNodeAttribute(pos, "marks", updatedMarks);
};

const toggleHighlightCellSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof CellSelection)) {
      return false;
    }

    let tr = state.tr;
    state.selection.forEachCell((cell, pos) => {
      const highlighted = (cell.attrs.marks ?? []).find(
        (mark: NodeMarkAttr) => mark.type === state.schema.marks.highlight.name
      );
      if (!highlighted) {
        tr = createCellHighlight(cell, pos, attrs, tr);
      } else if (highlighted && attrs.color) {
        tr = updateCellHighlight(cell, pos, attrs, tr);
      } else {
        tr = removeCellHighlight(cell, pos, tr);
      }
    });

    const nextSelection =
      Selection.findFrom(tr.doc.resolve(state.selection.to), 1, true) ??
      TextSelection.create(tr.doc, 0);

    dispatch?.(tr.setSelection(nextSelection));
    return true;
  };

export const toggleHighlight = (attrs: Attrs): Command =>
  chainCommands(
    toggleHighlightTextSelection(attrs),
    toggleHighlightCellSelection(attrs)
  );
