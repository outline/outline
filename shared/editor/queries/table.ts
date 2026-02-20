import type { EditorState } from "prosemirror-state";
import type { TableRect } from "prosemirror-tables";
import { CellSelection, isInTable, selectedRect } from "prosemirror-tables";
import { ColumnSelection } from "../selection/ColumnSelection";
import { RowSelection } from "../selection/RowSelection";
import type { EditorView } from "prosemirror-view";
import type { NodeAttrMark, NodeAttrMarkName } from "../types";
import type { Node } from "prosemirror-model";
import type { Selection } from "prosemirror-state";

/**
 * Checks if the current selection is a column selection.
 * @param state The editor state.
 * @returns True if the selection is a column selection, false otherwise.
 */
export function isColSelection(state: EditorState): boolean {
  if (state.selection instanceof ColumnSelection) {
    return state.selection.isColSelection();
  }
  return false;
}

/**
 * Checks if the current selection is a row selection.
 * @param state The editor state.
 * @returns True if the selection is a row selection, false otherwise.
 */
export function isRowSelection(state: EditorState): boolean {
  if (state.selection instanceof RowSelection) {
    return state.selection.isRowSelection();
  }
  return false;
}

export function getColumnIndex(state: EditorState): number | undefined {
  if (state.selection instanceof ColumnSelection) {
    if (state.selection.isColSelection()) {
      const rect = selectedRect(state);
      return rect.left;
    }
  }

  return undefined;
}

export function getRowIndex(state: EditorState): number | undefined {
  if (state.selection instanceof RowSelection) {
    if (state.selection.isRowSelection()) {
      const rect = selectedRect(state);
      return rect.top;
    }
  }

  return undefined;
}

/**
 * Get the actual row index in the table map for a given visual row index
 * when merged cells are present.
 *
 * @param visualRowIndex The visual row index (0-based)
 * @param state The editor state
 * @returns The actual row index in the table map, or -1 if not found
 */
export function getRowIndexInMap(
  visualRowIndex: number,
  state: EditorState
): number {
  if (!isInTable(state)) {
    return -1;
  }
  const rect = selectedRect(state);
  const cells = getCellsInColumn(0)(state);

  if (visualRowIndex >= 0 && visualRowIndex < cells.length) {
    const cellPos = cells[visualRowIndex] - rect.tableStart;

    // Find the row index in the table map for this cell position
    for (let row = 0; row < rect.map.height; row++) {
      const rowStart = row * rect.map.width;
      for (let col = 0; col < rect.map.width; col++) {
        if (rect.map.map[rowStart + col] === cellPos) {
          return row;
        }
      }
    }
  }

  return -1;
}

/**
 * Get the actual row positions in the table map, accounting for merged cells.
 *
 * Iterates through each visual row and returns the position of the first unique cell in that row.
 * This ensures correct row identification even when cells span multiple rows (rowspan > 1).
 *
 * @param state The editor state
 * @returns Array of cell positions representing the first unique cell in each row
 */
export function getRowsInTable(state: EditorState): number[] {
  if (!isInTable(state)) {
    return [];
  }

  const rect = selectedRect(state);
  const rows: number[] = [];
  const seenCells = new Set<number>();

  for (let row = 0; row < rect.map.height; row++) {
    // Find the leftmost cell in this row
    for (let col = 0; col < rect.map.width; col++) {
      const cellPos =
        rect.tableStart + rect.map.map[row * rect.map.width + col];
      if (!seenCells.has(cellPos)) {
        rows.push(cellPos);
        seenCells.add(cellPos);
        break; // Only add the first unique cell per row
      }
    }
  }

  return rows;
}

/**
 * Get the actual column positions in the table map, accounting for merged cells.
 *
 * @param state The editor state
 * @returns Array of cell positions representing the first unique cell in each column
 */
export function getColumnsInTable(state: EditorState): number[] {
  if (!isInTable(state)) {
    return [];
  }

  const rect = selectedRect(state);
  const columns: number[] = [];
  const seenCells = new Set<number>();

  for (let col = 0; col < rect.map.width; col++) {
    // Find the topmost cell in this column
    for (let row = 0; row < rect.map.height; row++) {
      const cellPos =
        rect.tableStart + rect.map.map[row * rect.map.width + col];
      if (!seenCells.has(cellPos)) {
        columns.push(cellPos);
        seenCells.add(cellPos);
        break; // Only add the first unique cell per column
      }
    }
  }

  return columns;
}

export function getCellsInColumn(index: number) {
  return (state: EditorState): number[] => {
    if (!isInTable(state)) {
      return [];
    }

    const rect = selectedRect(state);
    const cells = [];

    let previous;
    for (let i = index; i < rect.map.map.length; i += rect.map.width) {
      const cell = rect.tableStart + rect.map.map[i];

      // Ensure we don't add the same cell multiple times, this can happen
      // if the column is selected and the table row has merged cells.
      if (previous === cell) {
        continue;
      }
      previous = cell;

      cells.push(cell);
    }
    return cells;
  };
}

export function getCellsInRow(index: number) {
  return (state: EditorState): number[] => {
    if (!isInTable(state)) {
      return [];
    }

    const rect = selectedRect(state);
    const cells = [];

    let previous;
    for (let i = 0; i < rect.map.width; i += 1) {
      const cell = rect.tableStart + rect.map.map[index * rect.map.width + i];
      cells.push(cell);

      // Ensure we don't add the same cell multiple times, this can happen
      // if the row is selected and the table column has merged cells.
      if (previous === cell) {
        continue;
      }
      previous = cell;
    }

    return cells;
  };
}

/**
 * Check if a specific column is selected in the editor.
 *
 * @param state The editor state
 * @param index The index of the column to check
 * @returns Boolean indicating if the column is selected
 */
export function isColumnSelected(index: number) {
  return (state: EditorState): boolean => {
    if (isColSelection(state)) {
      const rect = selectedRect(state);
      return rect.left <= index && rect.right > index;
    }

    return false;
  };
}

/**
 * Check if the header is enabled for the given type and table rect
 *
 * @param state The editor state
 * @param type The type of header to check
 * @param rect The table rect
 * @returns Boolean indicating if the header is enabled
 */
export function isHeaderEnabled(
  state: EditorState,
  type: "row" | "column",
  rect: TableRect
): boolean {
  // Get cell positions for first row or first column
  const cellPositions = rect.map.cellsInRect({
    left: 0,
    top: 0,
    right: type === "row" ? rect.map.width : 1,
    bottom: type === "column" ? rect.map.height : 1,
  });

  for (let i = 0; i < cellPositions.length; i++) {
    const cell = rect.table.nodeAt(cellPositions[i]);
    if (cell && cell.type !== state.schema.nodes.th) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a specific row is selected in the editor.
 *
 * @param state The editor state
 * @param index The index of the row to check
 * @returns Boolean indicating if the row is selected
 */
export function isRowSelected(index: number) {
  return (state: EditorState): boolean =>
    state.selection instanceof RowSelection && state.selection.isRowSelection()
      ? state.selection.$index === index
      : false;
}

/**
 * Check if an entire table is selected in the editor.
 *
 * @param state The editor state
 * @returns Boolean indicating if the table is selected
 */
export function isTableSelected(state: EditorState): boolean {
  if (state.selection instanceof CellSelection) {
    const rect = selectedRect(state);

    return (
      rect.top === 0 &&
      rect.left === 0 &&
      rect.bottom === rect.map.height &&
      rect.right === rect.map.width &&
      !state.selection.empty
    );
  }

  return false;
}

/**
 * Check if multiple cells are selected in the editor.
 *
 * @param state The editor state
 * @returns Boolean indicating if multiple cells are selected
 */
export function isMultipleCellSelection(state: EditorState): boolean {
  const { selection } = state;

  return (
    selection instanceof CellSelection &&
    (selection.isColSelection() ||
      selection.isRowSelection() ||
      selection.$anchorCell.pos !== selection.$headCell.pos)
  );
}

/**
 * Check if the selection spans multiple merged cells.
 *
 * @param state The editor state
 * @returns Boolean indicating if a merged cell is selected
 */
export function isMergedCellSelection(state: EditorState): boolean {
  const { selection } = state;
  if (
    selection instanceof CellSelection ||
    selection instanceof RowSelection ||
    selection instanceof ColumnSelection
  ) {
    // Check if any cell in the selection has a colspan or rowspan > 1
    let hasMergedCells = false;
    selection.forEachCell((cell) => {
      if (cell.attrs.colspan > 1 || cell.attrs.rowspan > 1) {
        hasMergedCells = true;
        return false;
      }

      return true;
    });

    return hasMergedCells;
  }

  return false;
}

/**
 * Check if the table contains any cells with rowspan > 1.
 * Cells with rowspan span multiple rows and would break table sorting.
 *
 * @param state The editor state.
 * @returns true if the table has any cells with rowspan > 1, false otherwise.
 */
export function tableHasRowspan(state: EditorState): boolean {
  if (!isInTable(state)) {
    return false;
  }

  const rect = selectedRect(state);
  const seen = new Set<number>();

  for (let i = 0; i < rect.map.map.length; i++) {
    const pos = rect.map.map[i];

    // Skip already checked cells
    if (seen.has(pos)) {
      continue;
    }
    seen.add(pos);

    const cell = rect.table.nodeAt(pos);
    if (cell && cell.attrs.rowspan > 1) {
      return true;
    }
  }

  return false;
}

export function getAllSelectedColumns(state: EditorState): number[] {
  const rect = selectedRect(state);

  const selectedColumns: number[] = [];
  for (let col = rect.left; col < rect.right; col++) {
    selectedColumns.push(col);
  }

  return selectedColumns;
}

/**
 * Get the total width of selected columns by measuring DOM elements.
 * Uses getBoundingClientRect to get precise rendered widths including decimals.
 *
 * @param view The editor view
 * @param rect The table rect
 * @param selectedColumns Array of column indices to measure
 * @returns The total width in px, or 0 if measurement fails
 */
export function getWidthFromDom({
  view,
  rect,
  selectedColumns,
}: {
  view?: EditorView;
  rect: TableRect;
  selectedColumns: number[];
}): number {
  if (!view) {
    return 0;
  }

  const tableDOM = view.domAtPos(rect.tableStart).node as HTMLElement;
  const firstRow = tableDOM.closest("table")?.querySelector("tr");
  if (!firstRow) {
    return 0;
  }

  const cells = firstRow.querySelectorAll("td, th");
  return selectedColumns.reduce((total, colIndex) => {
    const cell = cells[colIndex] as HTMLElement | undefined;
    return total + (cell?.getBoundingClientRect().width ?? 0);
  }, 0);
}

/**
 * Get the total width of selected columns from node attributes.
 * Sums the colwidth values stored in the document state.
 *
 * @param state The editor state
 * @param selectedColumns Array of column indices to measure
 * @returns The total width in px from colwidth attributes
 */
export function getWidthFromNodes({
  state,
  selectedColumns,
}: {
  state: EditorState;
  selectedColumns: number[];
}): number {
  const firstRowCells = getCellsInRow(0)(state);
  if (!firstRowCells) {
    return 0;
  }

  return selectedColumns.reduce((total, colIndex) => {
    const cell =
      firstRowCells[colIndex] !== undefined
        ? state.doc.nodeAt(firstRowCells[colIndex])
        : null;
    const colwidth = cell?.attrs.colwidth;
    return total + (colwidth?.[0] ?? 0);
  }, 0);
}

const getCellAttrMark = (cell: Node, type: NodeAttrMarkName) => {
  const mark = (cell.attrs.marks ?? []).find(
    (mark: NodeAttrMark) => mark.type === type
  );

  return mark;
};

export const hasNodeAttrMarkCellSelection = (
  selection: CellSelection,
  type: NodeAttrMarkName
) => {
  let hasMark = false;
  selection.forEachCell((cell) => {
    if (!hasMark) {
      hasMark = !!getCellAttrMark(cell, type);
    }
  });

  return hasMark;
};

/**
 * Returns the set of background colors applied to selected cells.
 *
 * @param selection - The current selection.
 * @returns A set of color strings from background marks on selected cells.
 */
export function getColorSetForSelectedCells(selection: Selection): Set<string> {
  const colors = new Set<string>();
  if (!(selection instanceof CellSelection)) {
    // If not a CellSelection, return empty set
    return colors;
  }
  selection.forEachCell((cell) => {
    const backgroundMark = (cell.attrs.marks ?? []).find(
      (mark: NodeAttrMark) => mark.type === "background"
    );
    if (backgroundMark && backgroundMark.attrs.color) {
      colors.add(backgroundMark.attrs.color);
    }
  });
  return colors;
}

/**
 * Get all unique background colors used in table cells across the entire document.
 *
 * @param state The editor state.
 * @returns An array of unique hex color strings used for table cell backgrounds in the document.
 */
export function getDocumentTableBackgroundColors(state: EditorState): string[] {
  const colors = new Set<string>();

  state.doc.descendants((node) => {
    if (node.type.name === "td" || node.type.name === "th") {
      const backgroundMark = (node.attrs.marks ?? []).find(
        (mark: NodeAttrMark) => mark.type === "background"
      );
      if (backgroundMark && backgroundMark.attrs.color) {
        colors.add(backgroundMark.attrs.color);
      }
    }
  });

  return Array.from(colors);
}

/**
 * Returns true if any cell in the selection has a mark of the given type
 * with matching attributes.
 *
 * @param selection The CellSelection to check.
 * @param type The mark type to look for.
 * @param attrs The attributes to match against.
 * @returns True if any cell has the mark with matching attributes.
 */
export const hasNodeAttrMarkWithAttrsCellSelection = (
  selection: CellSelection,
  type: NodeAttrMarkName,
  attrs: Record<string, unknown>
) => {
  let attrsMatch = true;
  selection.forEachCell((cell) => {
    const cellMark = getCellAttrMark(cell, type);
    attrsMatch &&=
      !!cellMark &&
      Object.entries(attrs).every(
        ([key, value]) => (cellMark.attrs ?? {})[key] === value
      );
  });

  return attrsMatch;
};
