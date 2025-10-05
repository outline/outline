import { EditorState } from "prosemirror-state";
import {
  CellSelection,
  TableRect,
  isInTable,
  selectedRect,
} from "prosemirror-tables";
import { ColumnSelection } from "../selection/ColumnSelection";
import { RowSelection } from "../selection/RowSelection";

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
  return (state: EditorState): boolean => {
    if (isRowSelection(state)) {
      const rect = selectedRect(state);
      return rect.top <= index && rect.bottom > index;
    }

    return false;
  };
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
  if (selection instanceof CellSelection) {
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
