import type { Node } from "prosemirror-model";
import {
  createEditorStateWithSelection,
  doc,
  table,
  tr,
  td,
} from "@shared/test/editor";
import { sortTable } from "./table";

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
