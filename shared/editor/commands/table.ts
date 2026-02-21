import { GapCursor } from "prosemirror-gapcursor";
import type { Node, NodeType } from "prosemirror-model";
import { Slice } from "prosemirror-model";
import type { Command, EditorState, Transaction } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import {
  CellSelection,
  addRow,
  isInTable,
  selectedRect,
  tableNodeTypes,
  toggleHeader,
  addColumn,
  deleteRow,
  deleteColumn,
  deleteTable,
  mergeCells,
  splitCell,
  TableMap,
} from "prosemirror-tables";
import { ProsemirrorHelper } from "../../utils/ProsemirrorHelper";
import { CSVHelper } from "../../utils/csv";
import { isCurrency, parseCurrency } from "../../utils/currency";
import { parseDate } from "../../utils/date";
import { chainTransactions } from "../lib/chainTransactions";
import {
  getAllSelectedColumns,
  getCellsInColumn,
  getCellsInRow,
  isHeaderEnabled,
  isTableSelected,
  getWidthFromDom,
  getWidthFromNodes,
  getRowIndex,
  getColumnIndex,
  tableHasRowspan,
} from "../queries/table";
import { type NodeAttrMark, TableLayout } from "../types";
import { collapseSelection } from "./collapseSelection";
import { RowSelection } from "../selection/RowSelection";
import { ColumnSelection } from "../selection/ColumnSelection";
import type { Attrs } from "prosemirror-model";
import isUndefined from "lodash/isUndefined";
import find from "lodash/find";

/**
 * Restores column selection after a table operation that may have changed cell
 * positions or content.
 *
 * @param tr The transaction to update.
 * @param tableStart The position inside the table (after the table node).
 * @param columnIndex The column index to select.
 */
function restoreColumnSelection(
  tr: Transaction,
  tableStart: number,
  columnIndex: number
): void {
  const table = tr.doc.nodeAt(tableStart - 1);
  if (table) {
    const map = TableMap.get(table);
    const pos = map.positionAt(0, columnIndex, table);
    const $pos = tr.doc.resolve(tableStart + pos);
    tr.setSelection(ColumnSelection.colSelection($pos));
  }
}

export function createTable({
  rowsCount,
  colsCount,
  colWidth,
}: {
  /** The number of rows in the table. */
  rowsCount: number;
  /** The number of columns in the table. */
  colsCount: number;
  /** The widths of each column in the table. */
  colWidth: number;
}): Command {
  return (state, dispatch) => {
    if (dispatch) {
      const offset = state.tr.selection.anchor + 1;
      const nodes = createTableInner(state, rowsCount, colsCount, colWidth);
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
  colWidth?: number,
  withHeaderRow = true,
  cellContent?: Node
) {
  const types = tableNodeTypes(state.schema);
  const headerCells: Node[] = [];
  const cells: Node[] = [];
  const rows: Node[] = [];

  const createCell = (cellType: NodeType, attrs: Record<string, any> | null) =>
    cellContent
      ? cellType.createChecked(attrs, cellContent)
      : cellType.createAndFill(attrs);

  for (let index = 0; index < colsCount; index += 1) {
    const attrs =
      colWidth && index < colsCount - 1
        ? {
            colwidth: [colWidth],
            colspan: 1,
            rowspan: 1,
          }
        : null;
    const cell = createCell(types.cell, attrs);

    if (cell) {
      cells.push(cell);
    }

    if (withHeaderRow) {
      const headerCell = createCell(types.header_cell, attrs);

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

export function exportTable({
  fileName,
}: {
  format: string;
  fileName: string;
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

      const csv = table
        .map((row) =>
          row
            .map((cell) => {
              let value = ProsemirrorHelper.toPlainText(cell);

              // Escape double quotes by doubling them
              if (value.includes('"')) {
                value = value.replace(new RegExp('"', "g"), '""');
              }

              // Avoid cell content being interpreted as formulas by adding a leading single quote
              value = CSVHelper.sanitizeValue(value);

              return `"${value}"`;
            })
            .join(",")
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    return true;
  };
}

/**
 * A Commands that distributes the width of all selected columns evenly between them in the current table selection.
 *
 *
 * @returns {Command}
 */
export function distributeColumns(): Command {
  return (state, dispatch, view) => {
    if (!isInTable(state) || !dispatch) {
      return false;
    }

    const rect = selectedRect(state);
    const { tr, doc } = state;
    const { map } = rect;
    const selectedColumns = getAllSelectedColumns(state);
    if (selectedColumns.length <= 1) {
      return false;
    }

    const hasNullWidth = selectedColumns.some((colIndex) =>
      isNullWidth({ state, colIndex })
    );

    // whenever we can, we want to take the column width that prose-mirror sets
    // since that will always be accurate, when set
    const totalWidth = hasNullWidth
      ? getWidthFromDom({ view, rect, selectedColumns })
      : getWidthFromNodes({ state, selectedColumns });

    if (totalWidth < 1) {
      return false;
    }

    const evenWidth = totalWidth / selectedColumns.length;
    const isLastColSelected = selectedColumns.includes(map.width - 1);

    const tableNode = doc.nodeAt(rect.tableStart - 1);
    const isFullWidth = tableNode?.attrs.layout === TableLayout.fullWidth;

    for (let row = 0; row < map.height; row++) {
      const cellsInRow = getCellsInRow(row)(state);
      if (!cellsInRow || cellsInRow.length < 1) {
        continue;
      }

      selectedColumns.forEach((colIndex) => {
        const pos = cellsInRow[colIndex];
        const cell = pos !== undefined ? doc.nodeAt(pos) : null;
        if (!cell) {
          return;
        }

        const isLastColumn = colIndex === map.width - 1;
        const shouldKeepNull =
          isLastColumn && isLastColSelected && isFullWidth && hasNullWidth;

        tr.setNodeMarkup(pos, undefined, {
          ...cell.attrs,
          colwidth: shouldKeepNull ? null : [evenWidth],
        });
      });
    }

    dispatch(tr);
    return true;
  };
}

/**
 * Determines whether the width of a specified column is null.
 *
 * @param state - The current editor state.
 * @param colIndex - The index of the column to check.
 *
 * @returns {boolean} True if the column width is null, false otherwise.
 */
function isNullWidth({
  state,
  colIndex,
}: {
  state: EditorState;
  colIndex: number;
}): boolean {
  const firstRowCells = getCellsInRow(0)(state);
  const cell =
    firstRowCells?.[colIndex] !== undefined
      ? state.doc.nodeAt(firstRowCells[colIndex])
      : null;

  const colwidth = cell?.attrs.colwidth;
  return !colwidth?.[0];
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

    // Cannot sort tables with rowspan as it would break the table structure
    if (tableHasRowspan(state)) {
      return false;
    }

    if (dispatch) {
      const rect = selectedRect(state);

      // Build rows with both:
      // - columnMap: maps column index to cell (for sorting lookup, handles colspan)
      // - cells: unique cells in order (for row reconstruction)
      interface TableRow {
        columnMap: Map<number, Node>;
        cells: Node[];
      }

      const rows: TableRow[] = [];

      for (let r = 0; r < rect.map.height; r++) {
        const columnMap = new Map<number, Node>();
        const cells: Node[] = [];
        const seenPositions = new Set<number>();

        for (let c = 0; c < rect.map.width; c++) {
          const pos = rect.map.map[r * rect.map.width + c];
          const cell = state.doc.nodeAt(rect.tableStart + pos);

          if (cell) {
            // Map this column index to its cell (for sorting lookup)
            columnMap.set(c, cell);

            // Only add each unique cell once to the cells array (for row reconstruction)
            if (!seenPositions.has(pos)) {
              seenPositions.add(pos);
              cells.push(cell);
            }
          }
        }
        rows.push({ columnMap, cells });
      }

      const hasHeaderRow = rows[0].cells.every(
        (cell) => cell.type === state.schema.nodes.th
      );

      // remove the header row
      const header = hasHeaderRow ? rows.shift() : undefined;

      // Helper to get cell content at column index
      const getCellContent = (row: TableRow): string =>
        row.columnMap.get(index)?.textContent ?? "";

      // column data before sort
      const columnData = rows.map(getCellContent);

      // determine sorting type: date, currency, number, or text
      let compareAsDate = false;
      let compareAsCurrency = false;
      let compareAsNumber = false;

      const nonEmptyCells = columnData
        .map((content) => content.trim())
        .filter((content): content is string => content.length > 0);
      if (nonEmptyCells.length > 0) {
        // check if all non-empty cells are valid dates
        compareAsDate = nonEmptyCells.every((cell) => parseDate(cell) !== null);

        // if not dates, check if cells are currency values
        // treat as currency if at least 50% of non-empty cells look like currency values
        if (!compareAsDate) {
          const currencyCells = nonEmptyCells.filter((cell) =>
            isCurrency(cell)
          );
          const currencyRatio = currencyCells.length / nonEmptyCells.length;
          compareAsCurrency = currencyCells.length >= 2 && currencyRatio >= 0.5;
        }

        // if not currency, check if cells are numbers (same logic)
        if (!compareAsDate && !compareAsCurrency) {
          const numberCells = nonEmptyCells.filter(
            (cell) => !isNaN(parseFloat(cell))
          );
          const numberRatio = numberCells.length / nonEmptyCells.length;
          compareAsNumber = numberCells.length >= 2 && numberRatio >= 0.5;
        }
      }

      // sort rows based on column at index
      rows.sort((a, b) => {
        const aContent = getCellContent(a);
        const bContent = getCellContent(b);

        // empty cells always go to the end
        if (!aContent) {
          return bContent ? 1 : 0;
        }
        if (!bContent) {
          return -1;
        }

        if (compareAsDate) {
          const aDate = parseDate(aContent);
          const bDate = parseDate(bContent);
          // non-date cells go to the end (like empty cells)
          if (!aDate) {
            return bDate ? 1 : 0;
          }
          if (!bDate) {
            return -1;
          }
          return aDate.getTime() - bDate.getTime();
        } else if (compareAsCurrency) {
          const aValue = parseCurrency(aContent);
          const bValue = parseCurrency(bContent);
          // non-currency cells go to the end (like empty cells)
          if (aValue === null) {
            return bValue !== null ? 1 : 0;
          }
          if (bValue === null) {
            return -1;
          }
          return aValue - bValue;
        } else if (compareAsNumber) {
          const aNum = parseFloat(aContent);
          const bNum = parseFloat(bContent);
          // non-number cells go to the end (like empty cells)
          if (isNaN(aNum)) {
            return !isNaN(bNum) ? 1 : 0;
          }
          if (isNaN(bNum)) {
            return -1;
          }
          return aNum - bNum;
        } else {
          return aContent.localeCompare(bContent);
        }
      });

      if (direction === "desc") {
        rows.reverse();
      }

      // check if column data changed, if not then do not replace table
      if (columnData.join() === rows.map(getCellContent).join()) {
        return true;
      }

      // add the header row back
      if (header) {
        rows.unshift(header);
      }

      // create the new table
      const tableRows = [];
      for (let i = 0; i < rows.length; i += 1) {
        tableRows.push(
          state.schema.nodes.tr.createChecked(null, rows[i].cells)
        );
      }

      // replace the original table with this sorted one
      const nodes = state.schema.nodes.table.createChecked(
        rect.table.attrs,
        tableRows
      );
      const { tr } = state;

      tr.replaceRangeWith(
        rect.tableStart - 1,
        rect.tableStart - 1 + rect.table.nodeSize,
        nodes
      );

      restoreColumnSelection(tr, rect.tableStart, index);
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

/**
 * A command that safely adds a row taking into account any existing heading column at the top of
 * the table, and preventing it moving "into" the table.
 *
 * @param index The index to add the row at, if undefined the current selection is used
 * @returns The command
 */
export function addRowBefore({ index }: { index?: number }): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }

    const rect = selectedRect(state);
    const isHeaderRowEnabled = isHeaderEnabled(state, "row", rect);
    const position = index !== undefined ? index : rect.left;

    // Special case when adding row to the beginning of the table to ensure the header does not
    // move inwards.
    const headerSpecialCase = position === 0 && isHeaderRowEnabled;

    // Determine which row to copy alignment from (using original table indices)
    // When inserting at position 0, copy from original row 0
    // When inserting at other positions, copy from the row above (position - 1)
    const copyFromRow = position === 0 ? 0 : position - 1;

    chainTransactions(
      headerSpecialCase ? toggleHeader("row") : undefined,
      (s, d) =>
        !!d?.(addRowWithAlignment(s.tr, rect, position, copyFromRow, s)),
      headerSpecialCase ? toggleHeader("row") : undefined,
      collapseSelection()
    )(state, dispatch);

    return true;
  };
}

/**
 * A command that deletes the current selected row, if any.
 *
 * @returns The command
 */
export function deleteRowSelection(): Command {
  return (state, dispatch) => {
    if (
      state.selection instanceof CellSelection &&
      state.selection.isRowSelection()
    ) {
      return deleteRow(state, dispatch);
    }
    return false;
  };
}

/**
 * A command that deletes the current selected column, if any.
 *
 * @returns The command
 */
export function deleteColSelection(): Command {
  return (state, dispatch) => {
    if (
      state.selection instanceof CellSelection &&
      state.selection.isColSelection()
    ) {
      return deleteColumn(state, dispatch);
    }
    return false;
  };
}

/**
 * A command that safely adds a column taking into account any existing heading column on the far
 * left of the table, and preventing it moving "into" the table.
 *
 * @param index The index to add the column at, if undefined the current selection is used
 * @returns The command
 */
export function addColumnBefore({ index }: { index?: number }): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }

    const rect = selectedRect(state);
    const isHeaderColumnEnabled = isHeaderEnabled(state, "column", rect);
    const position = index !== undefined ? index : rect.left;

    // Special case when adding column to the beginning of the table to ensure the header does not
    // move inwards.
    const headerSpecialCase = position === 0 && isHeaderColumnEnabled;

    chainTransactions(
      headerSpecialCase ? toggleHeader("column") : undefined,
      (s, d) => !!d?.(addColumn(s.tr, rect, position)),
      headerSpecialCase ? toggleHeader("column") : undefined,
      collapseSelection()
    )(state, dispatch);

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
      // Copy alignment from the current row (which will be pushed down)
      const copyFromRow = indexBefore;
      dispatch?.(
        addRowWithAlignment(state.tr, rect, indexBefore, copyFromRow, state)
      );
      return true;
    }

    const indexAfter = index !== undefined ? index + 1 : rect.bottom;
    // Copy alignment from the row above the insertion point
    const copyFromRow = indexAfter > 0 ? indexAfter - 1 : undefined;
    const tr = addRowWithAlignment(
      state.tr,
      rect,
      indexAfter,
      copyFromRow,
      state
    );

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

/**
 * Set column attributes. Passed attributes will be merged with existing.
 *
 * @param attrs The attributes to set
 * @returns The command
 */
export function setColumnAttr({
  index,
  alignment,
}: {
  index: number;
  alignment: string;
}): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }

    if (dispatch) {
      const rect = selectedRect(state);
      const cells = getCellsInColumn(index)(state) || [];
      let tr = state.tr;
      cells.forEach((pos) => {
        const node = state.doc.nodeAt(pos);
        tr = tr.setNodeMarkup(pos, undefined, {
          ...node?.attrs,
          alignment,
        });
      });

      restoreColumnSelection(tr, rect.tableStart, index);
      dispatch(tr);
    }
    return true;
  };
}

/**
 * Set table attributes. Passed attributes will be merged with existing.
 *
 * @param attrs The attributes to set
 * @returns The command
 */
export function setTableAttr(attrs: { layout: TableLayout | null }): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }

    if (dispatch) {
      const { tr } = state;
      const rect = selectedRect(state);

      tr.setNodeMarkup(rect.tableStart - 1, undefined, {
        ...rect.table.attrs,
        ...attrs,
      }).setSelection(TextSelection.near(tr.doc.resolve(rect.tableStart)));
      dispatch(tr);
      return true;
    }
    return false;
  };
}

export function selectRow(index: number, expand = false): Command {
  return (state: EditorState, dispatch): boolean => {
    if (dispatch) {
      const rect = selectedRect(state);
      const pos = rect.map.positionAt(index, 0, rect.table);
      const $pos = state.doc.resolve(rect.tableStart + pos);
      const rowSelection =
        expand && state.selection instanceof CellSelection
          ? RowSelection.rowSelection(state.selection.$anchorCell, $pos, index)
          : RowSelection.rowSelection($pos, $pos, index);
      dispatch(state.tr.setSelection(rowSelection));
      return true;
    }
    return false;
  };
}

export function selectColumn(index: number, expand = false): Command {
  return (state, dispatch): boolean => {
    if (dispatch) {
      const rect = selectedRect(state);
      const pos = rect.map.positionAt(0, index, rect.table);
      const $pos = state.doc.resolve(rect.tableStart + pos);
      const colSelection =
        expand && state.selection instanceof CellSelection
          ? ColumnSelection.colSelection(state.selection.$anchorCell, $pos)
          : ColumnSelection.colSelection($pos);
      dispatch(state.tr.setSelection(colSelection));
      return true;
    }
    return false;
  };
}

export function selectTable(): Command {
  return (state, dispatch): boolean => {
    if (dispatch) {
      const rect = selectedRect(state);
      const map = rect.map.map;
      const $anchor = state.doc.resolve(rect.tableStart + map[0]);
      const $head = state.doc.resolve(rect.tableStart + map[map.length - 1]);
      const tableSelection = new CellSelection($anchor, $head);
      dispatch(state.tr.setSelection(tableSelection));
      return true;
    }
    return false;
  };
}

export function moveOutOfTable(direction: 1 | -1): Command {
  return (state, dispatch): boolean => {
    if (dispatch) {
      if (state.selection instanceof GapCursor) {
        return false;
      }
      if (!isInTable(state)) {
        return false;
      }

      // check if current cursor position is at the top or bottom of the table
      const rect = selectedRect(state);
      const topOfTable =
        rect.top === 0 && rect.bottom === 1 && direction === -1;
      const bottomOfTable =
        rect.top === rect.map.height - 1 &&
        rect.bottom === rect.map.height &&
        direction === 1;

      if (!topOfTable && !bottomOfTable) {
        return false;
      }

      const map = rect.map.map;
      const $start = state.doc.resolve(rect.tableStart + map[0] - 1);
      const $end = state.doc.resolve(rect.tableStart + map[map.length - 1] + 2);

      // @ts-expect-error findGapCursorFrom is a ProseMirror internal method.
      const $found = GapCursor.findGapCursorFrom(
        direction > 0 ? $end : $start,
        direction,
        true
      );

      if ($found) {
        dispatch(state.tr.setSelection(new GapCursor($found)));
        return true;
      }
    }
    return false;
  };
}

/**
 * A command that deletes the entire table if all cells are selected.
 *
 * @returns The command
 */
export function deleteTableIfSelected(): Command {
  return (state, dispatch): boolean => {
    if (isTableSelected(state)) {
      return deleteTable(state, dispatch);
    }
    return false;
  };
}

export function deleteCellSelection(
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean {
  const sel = state.selection;
  if (!(sel instanceof CellSelection)) {
    return false;
  }
  if (dispatch) {
    const tr = state.tr;
    const baseContent = tableNodeTypes(state.schema).cell.createAndFill()!
      .content;
    sel.forEachCell((cell, pos) => {
      if (!cell.content.eq(baseContent)) {
        tr.replace(
          tr.mapping.map(pos + 1),
          tr.mapping.map(pos + cell.nodeSize - 1),
          new Slice(baseContent, 0, 0)
        );
      }
    });
    if (tr.docChanged) {
      dispatch(tr);
      return true;
    }
  }
  return false;
}

/**
 * A command that splits the first merged cell found in the selection and
 * collapses the selection. Works with both single cell and multi-cell selections.
 *
 * @returns The command
 */
export function splitCellAndCollapse(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }

    const { selection } = state;

    // Handle CellSelection (including RowSelection and ColumnSelection which extend it)
    if (
      selection instanceof CellSelection ||
      selection instanceof RowSelection ||
      selection instanceof ColumnSelection
    ) {
      // Find the first merged cell in the selection
      let mergedCellPos: number | null = null;
      selection.forEachCell((cell, pos) => {
        if (
          mergedCellPos === null &&
          (cell.attrs.colspan > 1 || cell.attrs.rowspan > 1)
        ) {
          mergedCellPos = pos;
        }
      });

      // If no merged cell found, nothing to split
      if (mergedCellPos === null) {
        return false;
      }

      if (dispatch) {
        // Create a CellSelection for the merged cell and apply splitCell
        const $cell = state.doc.resolve(mergedCellPos);
        const cellSelection = new CellSelection($cell);
        const stateWithCellSelection = state.apply(
          state.tr.setSelection(cellSelection)
        );

        // Apply splitCell and collapse
        chainTransactions(splitCell, collapseSelection())(
          stateWithCellSelection,
          dispatch
        );
      }

      return true;
    }

    // Fallback to standard splitCell for non-cell selections
    return chainTransactions(splitCell, collapseSelection())(state, dispatch);
  };
}

/**
 * Helper function to add a row while copying alignment attributes from an existing row.
 *
 * @param tr The transaction
 * @param rect The table rect
 * @param index The index where to insert the row
 * @param copyFromRow The row index to copy alignment from (optional)
 * @param state The editor state
 * @returns The modified transaction
 */
function addRowWithAlignment(
  tr: Transaction,
  rect: any,
  index: number,
  copyFromRow: number | undefined,
  state: EditorState
): Transaction {
  // Get alignment attributes from the source row BEFORE inserting the new row
  let sourceRowAlignments: (string | null)[] | undefined;

  if (
    copyFromRow !== undefined &&
    copyFromRow >= 0 &&
    copyFromRow < rect.map.height
  ) {
    const cellsInSourceRow = getCellsInRow(copyFromRow)(state);
    if (cellsInSourceRow) {
      sourceRowAlignments = cellsInSourceRow.map((pos) => {
        const node = tr.doc.nodeAt(pos);
        return node?.attrs.alignment || null;
      });
    }
  }

  // Now add the row using the standard prosemirror function
  const newTr = addRow(tr, rect, index);

  // Apply the copied alignments to the new row
  if (sourceRowAlignments) {
    const newState = state.apply(newTr);
    const cellsInNewRow = getCellsInRow(index)(newState);

    if (cellsInNewRow) {
      cellsInNewRow.forEach((newCellPos, colIndex) => {
        if (
          colIndex < sourceRowAlignments.length &&
          sourceRowAlignments[colIndex]
        ) {
          const newCellNode = newTr.doc.nodeAt(newCellPos);
          if (newCellNode) {
            const attrs = {
              ...newCellNode.attrs,
              alignment: sourceRowAlignments[colIndex],
            };
            newTr.setNodeMarkup(newCellPos, undefined, attrs);
          }
        }
      });
    }
  }

  return newTr;
}

/**
 * A command that merges selected cells and collapses the selection.
 *
 * @returns The command
 */
export function mergeCellsAndCollapse(): Command {
  return chainTransactions(mergeCells, collapseSelection());
}

const updateCellBackground = (
  cell: Node,
  pos: number,
  attrs: Attrs,
  tr: Transaction
): Transaction => {
  const existingMarks = cell.attrs.marks ?? [];
  const backgroundMark = find(existingMarks, (m) => m.type === "background");
  const updatedMarks = !backgroundMark
    ? [...existingMarks, { type: "background", attrs }]
    : existingMarks.map((mark: NodeAttrMark) =>
        mark.type === "background"
          ? { ...mark, attrs: { ...mark.attrs, ...attrs } }
          : mark
      );
  return tr.setNodeAttribute(pos, "marks", updatedMarks);
};

const removeCellBackground = (
  cell: Node,
  pos: number,
  tr: Transaction
): Transaction => {
  const existingMarks = cell.attrs.marks ?? [];
  const updatedMarks = existingMarks.filter(
    (mark: NodeAttrMark) => mark.type !== "background"
  );
  return tr.setNodeAttribute(pos, "marks", updatedMarks);
};

export const toggleCellSelectionBackgroundAndCollapseSelection = ({
  color,
}: {
  color: string | null;
}) =>
  chainTransactions(
    toggleCellSelectionBackground({ color }),
    collapseSelection()
  );

export const toggleRowBackgroundAndCollapseSelection = ({
  color,
}: {
  color: string | null;
}) => chainTransactions(toggleRowBackground({ color }), collapseSelection());

export const toggleColumnBackgroundAndCollapseSelection = ({
  color,
}: {
  color: string | null;
}) => chainTransactions(toggleColumnBackground({ color }), collapseSelection());

export const toggleCellSelectionBackground =
  ({ color }: { color: string | null }): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof CellSelection)) {
      return false;
    }

    let tr = state.tr;
    state.selection.forEachCell((cell, pos) => {
      if (color === null) {
        tr = removeCellBackground(cell, pos, tr);
      } else {
        tr = updateCellBackground(cell, pos, { color }, tr);
      }
    });

    dispatch?.(tr);
    return true;
  };

/**
 * Set background color on all cells in a row.
 *
 * @param color The background color to set, or null to remove
 * @returns The command
 */
export function toggleRowBackground({
  color,
}: {
  color: string | null;
}): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }

    const rowIndex = getRowIndex(state);
    if (isUndefined(rowIndex)) {
      return false;
    }

    if (dispatch) {
      const cells = getCellsInRow(rowIndex)(state) || [];
      let tr = state.tr;

      cells.forEach((pos) => {
        const node = state.doc.nodeAt(pos);
        if (!node) {
          return;
        }

        if (color === null) {
          tr = removeCellBackground(node, pos, tr);
        } else {
          tr = updateCellBackground(node, pos, { color }, tr);
        }
      });

      // It was noticed that the selection went to the last table cell of the
      // row after command execution.
      // Instead, we want to preserve the original row selection so that the color
      // picker can be prevented from closing.
      const rect = selectedRect(state);
      const pos = rect.map.positionAt(rowIndex, 0, rect.table);
      const $pos = tr.doc.resolve(rect.tableStart + pos);
      tr.setSelection(RowSelection.rowSelection($pos, $pos, rowIndex));

      dispatch(tr);
    }
    return true;
  };
}

/**
 * Set background color on all cells in a column.
 *
 * @param color The background color to set, or null to remove
 * @returns The command
 */
export function toggleColumnBackground({
  color,
}: {
  color: string | null;
}): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }

    const colIndex = getColumnIndex(state);
    if (isUndefined(colIndex)) {
      return false;
    }

    if (dispatch) {
      const rect = selectedRect(state);
      const cells = getCellsInColumn(colIndex)(state) || [];
      let tr = state.tr;

      cells.forEach((pos) => {
        const node = state.doc.nodeAt(pos);
        if (!node) {
          return;
        }

        if (color === null) {
          tr = removeCellBackground(node, pos, tr);
        } else {
          tr = updateCellBackground(node, pos, { color }, tr);
        }
      });

      restoreColumnSelection(tr, rect.tableStart, colIndex);
      dispatch(tr);
    }
    return true;
  };
}
