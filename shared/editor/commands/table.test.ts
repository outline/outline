import type { Node } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import {
  createEditorStateWithSelection,
  doc,
  table,
  tr,
  td,
} from "@shared/test/editor";
import { canMergeCells, getRowIndex } from "../queries/table";
import {
  addRowAfter,
  deleteRows,
  mergeCellsAndCollapse,
  selectColumn,
  selectRow,
  sortTable,
} from "./table";

/**
 * Applies a command to the state and returns the resulting state.
 */
function run(state: EditorState, command: Command): EditorState {
  let next = state;
  command(state, (tx) => {
    next = next.apply(tx);
  });
  return next;
}

/**
 * Returns the text and rowspan of each cell in the first table of the state.
 */
function getCells(state: EditorState): string[][] {
  const rows: string[][] = [];
  (state.doc.firstChild as Node).forEach((row) => {
    const cells: string[] = [];
    row.forEach((cell) => {
      cells.push(
        cell.attrs.rowspan > 1
          ? `${cell.textContent}:${cell.attrs.rowspan}`
          : cell.textContent
      );
    });
    rows.push(cells);
  });
  return rows;
}

/**
 * Creates a state with a table whose first column has a cell spanning rows
 * one to three.
 */
function createMergedState(): EditorState {
  const testDoc = doc([
    table([
      tr([td("h0"), td("h1")]),
      tr([td("M", { rowspan: 3 }), td("b1")]),
      tr([td("b2")]),
      tr([td("b3")]),
    ]),
  ]);
  return createEditorStateWithSelection(testDoc, 4);
}

/**
 * Builds a table document from a 2D array of cell strings (rows of columns),
 * runs sortTable on the given column, and returns the resulting rows as a 2D
 * array of cell text.
 */
function runSort(
  data: string[][],
  index: number,
  direction: "asc" | "desc"
): string[][] {
  const testDoc = doc([
    table(data.map((row) => tr(row.map((cell) => td(cell))))),
  ]);
  // place the selection inside the first cell of the table
  let state = createEditorStateWithSelection(testDoc, 4);

  sortTable({ index, direction })(state, (tx) => {
    state = state.apply(tx);
  });

  const resultTable = state.doc.firstChild as Node;
  const rows: string[][] = [];
  resultTable.forEach((row) => {
    const cells: string[] = [];
    row.forEach((cell) => cells.push(cell.textContent));
    rows.push(cells);
  });
  return rows;
}

describe("sortTable", () => {
  it("sorts a text column ascending and descending", () => {
    const data = [["banana"], ["apple"], ["cherry"]];
    expect(runSort(data, 0, "asc")).toEqual([
      ["apple"],
      ["banana"],
      ["cherry"],
    ]);
    expect(runSort(data, 0, "desc")).toEqual([
      ["cherry"],
      ["banana"],
      ["apple"],
    ]);
  });

  it("sorts IP addresses octet-wise within a subnet", () => {
    const data = [["192.168.69.10"], ["192.168.69.9"], ["192.168.69.2"]];
    expect(runSort(data, 0, "asc")).toEqual([
      ["192.168.69.2"],
      ["192.168.69.9"],
      ["192.168.69.10"],
    ]);
  });

  it("sorts IP addresses octet-wise across subnets", () => {
    const data = [["192.168.150.10"], ["192.168.69.20"], ["10.0.0.1"]];
    expect(runSort(data, 0, "asc")).toEqual([
      ["10.0.0.1"],
      ["192.168.69.20"],
      ["192.168.150.10"],
    ]);
  });

  it("keeps empty cells last in both directions", () => {
    const data = [["b"], [""], ["a"], ["c"]];
    expect(runSort(data, 0, "asc")).toEqual([["a"], ["b"], ["c"], [""]]);
    expect(runSort(data, 0, "desc")).toEqual([["c"], ["b"], ["a"], [""]]);
  });

  it("is stable so sorts can be chained into a multi-key order", () => {
    // Inventory of [VLAN, IP]. First sort by the secondary key (IP), then by
    // the primary key (VLAN). A stable sort must preserve the IP order within
    // each VLAN group.
    const inventory = [
      ["20", "192.168.20.10"],
      ["10", "192.168.10.5"],
      ["20", "192.168.20.2"],
      ["10", "192.168.10.20"],
      ["10", "192.168.10.3"],
    ];

    const byIP = runSort(inventory, 1, "asc");
    const byVlanThenIP = runSort(byIP, 0, "asc");

    expect(byVlanThenIP).toEqual([
      ["10", "192.168.10.3"],
      ["10", "192.168.10.5"],
      ["10", "192.168.10.20"],
      ["20", "192.168.20.2"],
      ["20", "192.168.20.10"],
    ]);
  });
});

describe("merged cells", () => {
  it("selects the row under a merged cell by its index", () => {
    const state = run(createMergedState(), selectRow(2));
    expect(getRowIndex(state)).toBe(2);
  });

  it("deletes only the selected row inside a merged cell", () => {
    let state = run(createMergedState(), selectRow(2));
    state = run(state, deleteRows());
    expect(getCells(state)).toEqual([["h0", "h1"], ["M:2", "b1"], ["b3"]]);
  });

  it("keeps a merged cell when deleting its first row", () => {
    let state = run(createMergedState(), selectRow(1));
    state = run(state, deleteRows());
    expect(getCells(state)).toEqual([["h0", "h1"], ["M:2", "b2"], ["b3"]]);
  });

  it("inserts a row after the selected row inside a merged cell", () => {
    let state = run(createMergedState(), selectRow(2));
    state = run(state, addRowAfter({ index: getRowIndex(state) }));
    expect(getCells(state)).toEqual([
      ["h0", "h1"],
      ["M:4", "b1"],
      ["b2"],
      [""],
      ["b3"],
    ]);
  });

  it("only merges a row when no cell spans beyond it", () => {
    const testDoc = doc([
      table([
        tr([td("M", { rowspan: 2 }), td("a1"), td("a2")]),
        tr([td("b1"), td("b2")]),
        tr([td("c0"), td("c1"), td("c2")]),
      ]),
    ]);
    const state = createEditorStateWithSelection(testDoc, 4);
    expect(canMergeCells(run(state, selectRow(0)))).toBe(false);
    expect(canMergeCells(run(state, selectRow(1)))).toBe(false);
    expect(
      canMergeCells(run(run(state, selectRow(1)), selectRow(2, true)))
    ).toBe(false);

    const merged = run(run(state, selectRow(2)), mergeCellsAndCollapse());
    expect(getCells(merged)).toEqual([
      ["M:2", "a1", "a2"],
      ["b1", "b2"],
      ["c0c1c2"],
    ]);
  });

  it("only merges a column when no cell spans beyond it", () => {
    const testDoc = doc([
      table([
        tr([td("M", { colspan: 2 }), td("a2")]),
        tr([td("b0"), td("b1"), td("b2")]),
      ]),
    ]);
    const state = createEditorStateWithSelection(testDoc, 4);
    expect(canMergeCells(run(state, selectColumn(1)))).toBe(false);
    expect(canMergeCells(run(state, selectColumn(2)))).toBe(true);
  });

  it("keeps repeated content once when merging cells", () => {
    const testDoc = doc([
      table([
        tr([td("A"), td("1")]),
        tr([td("A"), td("2")]),
        tr([td("B"), td("3")]),
      ]),
    ]);
    let state = createEditorStateWithSelection(testDoc, 4);
    state = run(state, selectColumn(0));
    state = run(state, mergeCellsAndCollapse());

    const merged = (state.doc.firstChild as Node).child(0).child(0);
    expect(merged.attrs.rowspan).toBe(3);
    expect(merged.childCount).toBe(2);
    expect(merged.textContent).toBe("AB");
  });
});
