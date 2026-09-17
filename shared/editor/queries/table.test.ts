import { TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import {
  createEditorStateWithSelection,
  doc,
  p,
  table,
  td,
  tr,
} from "@shared/test/editor";
import { hasTableSelectionChanged } from "./table";

/**
 * Document layout:
 *
 *   0  table
 *   1    tr
 *   2      td   (content starts at 3, paragraph text at 4)
 *   9      td   (content starts at 10, paragraph text at 11)
 *  18  paragraph "between"  (text at 19)
 *  27  table
 *  28   tr
 *  29     td   (paragraph text at 31)
 */
function state(pos: number) {
  return createEditorStateWithSelection(
    doc([
      table([tr([td("one"), td("two")])]),
      p("between"),
      table([tr([td("three")])]),
    ]),
    pos
  );
}

describe("hasTableSelectionChanged", () => {
  it("is false when the selection is not set", () => {
    const s = state(4);
    const t = s.tr.insertText("x", 5);
    expect(hasTableSelectionChanged(t, s, s.apply(t))).toBe(false);
  });

  it("is false when the cursor moves within one table", () => {
    const s = state(4);
    const t = s.tr.setSelection(TextSelection.create(s.doc, 12));
    expect(hasTableSelectionChanged(t, s, s.apply(t))).toBe(false);
  });

  it("is false when typing keeps the cursor in the same table", () => {
    const s = state(4);
    const t = s.tr.insertText("x", 4);
    t.setSelection(TextSelection.create(t.doc, 5));
    expect(hasTableSelectionChanged(t, s, s.apply(t))).toBe(false);
  });

  it("is false when the cursor moves outside of any table", () => {
    const s = state(19);
    const t = s.tr.setSelection(TextSelection.create(s.doc, 22));
    expect(hasTableSelectionChanged(t, s, s.apply(t))).toBe(false);
  });

  it("is true when the cursor moves out of a table", () => {
    const s = state(4);
    const t = s.tr.setSelection(TextSelection.create(s.doc, 19));
    expect(hasTableSelectionChanged(t, s, s.apply(t))).toBe(true);
  });

  it("is true when the cursor moves into a table", () => {
    const s = state(19);
    const t = s.tr.setSelection(TextSelection.create(s.doc, 4));
    expect(hasTableSelectionChanged(t, s, s.apply(t))).toBe(true);
  });

  it("is true when the cursor moves between tables", () => {
    const s = state(4);
    const t = s.tr.setSelection(TextSelection.create(s.doc, 31));
    expect(hasTableSelectionChanged(t, s, s.apply(t))).toBe(true);
  });

  it("is true when cells become selected", () => {
    const s = state(4);
    const t = s.tr.setSelection(CellSelection.create(s.doc, 2, 9));
    expect(hasTableSelectionChanged(t, s, s.apply(t))).toBe(true);
  });

  it("is true when a cell selection is dropped", () => {
    const s = state(4);
    const selected = s.apply(
      s.tr.setSelection(CellSelection.create(s.doc, 2, 9))
    );
    const t = selected.tr.setSelection(TextSelection.create(selected.doc, 4));
    expect(hasTableSelectionChanged(t, selected, selected.apply(t))).toBe(true);
  });
});
