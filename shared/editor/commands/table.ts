import { Fragment, Node, NodeType } from "prosemirror-model";
import {
  Command,
  EditorState,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import {
  CellSelection,
  addRow,
  isInTable,
  selectedRect,
  tableNodeTypes,
} from "prosemirror-tables";
import { getCellsInColumn } from "../queries/table";

export function createTable({
  rowsCount,
  colsCount,
}: {
  rowsCount: number;
  colsCount: number;
}): Command {
  return (state, dispatch) => {
    if (dispatch) {
      const offset = state.tr.selection.anchor + 1;
      const nodes = createTableInner(state, rowsCount, colsCount);
      const tr = state.tr.replaceSelectionWith(nodes).scrollIntoView();
      const resolvedPos = tr.doc.resolve(offset);
      tr.setSelection(TextSelection.near(resolvedPos));
      dispatch(tr);
    }
    return true;
  };
}

export function createTableInner(
  state: EditorState,
  rowsCount: number,
  colsCount: number,
  withHeaderRow = true,
  cellContent?: Node
) {
  const types = tableNodeTypes(state.schema);
  const headerCells: Node[] = [];
  const cells: Node[] = [];
  const rows: Node[] = [];

  const createCell = (
    cellType: NodeType,
    cellContent: Fragment | Node | readonly Node[] | null | undefined
  ) =>
    cellContent
      ? cellType.createChecked(null, cellContent)
      : cellType.createAndFill();

  for (let index = 0; index < colsCount; index += 1) {
    const cell = createCell(types.cell, cellContent);

    if (cell) {
      cells.push(cell);
    }

    if (withHeaderRow) {
      const headerCell = createCell(types.header_cell, cellContent);

      if (headerCell) {
        headerCells.push(headerCell);
      }
    }
  }

  for (let index = 0; index < rowsCount; index += 1) {
    rows.push(
      types.row.createChecked(
        null,
        withHeaderRow && index === 0 ? headerCells : cells
      )
    );
  }

  return types.table.createChecked(null, rows);
}

export function sortTable({
  index,
  direction,
}: {
  index: number;
  direction: "asc" | "desc";
}): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    if (dispatch) {
      const rect = selectedRect(state);
      const table: Node[][] = [];

      for (let r = 0; r < rect.map.height; r++) {
        const cells = [];
        for (let c = 0; c < rect.map.width; c++) {
          const cell = state.doc.nodeAt(
            rect.tableStart + rect.map.map[r * rect.map.width + c]
          );
          if (cell) {
            cells.push(cell);
          }
        }
        table.push(cells);
      }

      // check if all the cells in the column are a number
      const compareAsText = table.some((row) => {
        const cell = row[index]?.textContent;
        return cell === "" ? false : isNaN(parseFloat(cell));
      });

      // remove the header row
      const header = table.shift();

      // column data before sort
      const columnData = table.map((row) => row[index]?.textContent ?? "");

      // sort table data based on column at index
      table.sort((a, b) => {
        if (compareAsText) {
          return (a[index]?.textContent ?? "").localeCompare(
            b[index]?.textContent ?? ""
          );
        } else {
          return (
            parseFloat(a[index]?.textContent ?? "") -
            parseFloat(b[index]?.textContent ?? "")
          );
        }
      });

      if (direction === "desc") {
        table.reverse();
      }

      // check if column data changed, if not then do not replace table
      if (
        columnData.join() === table.map((row) => row[index]?.textContent).join()
      ) {
        return true;
      }

      // add the header row back
      if (header) {
        table.unshift(header);
      }

      // create the new table
      const rows = [];
      for (let i = 0; i < table.length; i += 1) {
        rows.push(state.schema.nodes.tr.createChecked(null, table[i]));
      }

      // replace the original table with this sorted one
      const nodes = state.schema.nodes.table.createChecked(null, rows);
      const { tr } = state;

      tr.replaceRangeWith(
        rect.tableStart - 1,
        rect.tableStart - 1 + rect.table.nodeSize,
        nodes
      );

      dispatch(
        tr
          // .setSelection(
          //   CellSelection.create(
          //     tr.doc,
          //     rect.map.positionAt(0, index, rect.table)
          //   )
          // )
          .scrollIntoView()
      );
    }
    return true;
  };
}

export function addRowAndMoveSelection({
  index,
}: {
  index?: number;
} = {}): Command {
  return (state, dispatch, view) => {
    if (!isInTable(state)) {
      return false;
    }

    const rect = selectedRect(state);
    const cells = getCellsInColumn(0)(state);

    // If the cursor is at the beginning of the first column then insert row
    // above instead of below.
    if (rect.left === 0 && view?.endOfTextblock("backward", state)) {
      const indexBefore = index !== undefined ? index - 1 : rect.top;
      dispatch?.(addRow(state.tr, rect, indexBefore));
      return true;
    }

    const indexAfter = index !== undefined ? index + 1 : rect.bottom;
    const tr = addRow(state.tr, rect, indexAfter);

    // Special case when adding row to the end of the table as the calculated
    // rect does not include the row that we just added.
    if (indexAfter !== rect.map.height) {
      const pos = cells[Math.min(cells.length - 1, indexAfter)];
      const $pos = tr.doc.resolve(pos);
      dispatch?.(tr.setSelection(TextSelection.near($pos)));
    } else {
      const $pos = tr.doc.resolve(rect.tableStart + rect.table.nodeSize);
      dispatch?.(tr.setSelection(TextSelection.near($pos)));
    }

    return true;
  };
}

export function setColumnAttr({
  index,
  alignment,
}: {
  index: number;
  alignment: string;
}): Command {
  return (state, dispatch) => {
    if (dispatch) {
      const cells = getCellsInColumn(index)(state) || [];
      let transaction = state.tr;
      cells.forEach((pos) => {
        transaction = transaction.setNodeMarkup(pos, undefined, {
          alignment,
        });
      });
      dispatch(transaction);
    }
    return true;
  };
}

export function selectRow(index: number, expand = false) {
  return (state: EditorState): Transaction => {
    const rect = selectedRect(state);
    const pos = rect.map.positionAt(index, 0, rect.table);
    const $pos = state.doc.resolve(rect.tableStart + pos);
    const rowSelection =
      expand && state.selection instanceof CellSelection
        ? CellSelection.rowSelection(state.selection.$anchorCell, $pos)
        : CellSelection.rowSelection($pos);
    return state.tr.setSelection(rowSelection);
  };
}

export function selectColumn(index: number, expand = false) {
  return (state: EditorState): Transaction => {
    const rect = selectedRect(state);
    const pos = rect.map.positionAt(0, index, rect.table);
    const $pos = state.doc.resolve(rect.tableStart + pos);
    const colSelection =
      expand && state.selection instanceof CellSelection
        ? CellSelection.colSelection(state.selection.$anchorCell, $pos)
        : CellSelection.colSelection($pos);
    return state.tr.setSelection(colSelection);
  };
}

export function selectTable(state: EditorState): Transaction {
  const rect = selectedRect(state);
  const map = rect.map.map;
  const $anchor = state.doc.resolve(rect.tableStart + map[0]);
  const $head = state.doc.resolve(rect.tableStart + map[map.length - 1]);
  const tableSelection = new CellSelection($anchor, $head);
  return state.tr.setSelection(tableSelection);
}
