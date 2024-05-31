import { EditorState } from "prosemirror-state";
import {
  CellSelection,
  TableRect,
  isInTable,
  selectedRect,
} from "prosemirror-tables";

export function getColumnIndex(state: EditorState): number | undefined {
  if (state.selection instanceof CellSelection) {
    if (state.selection.isColSelection()) {
      const rect = selectedRect(state);
      return rect.left;
    }
  }

  return undefined;
}

export function getRowIndex(state: EditorState): number | undefined {
  if (state.selection instanceof CellSelection) {
    if (state.selection.isRowSelection()) {
      const rect = selectedRect(state);
      return rect.top;
    }
  }

  return undefined;
}

export function getCellsInColumn(index: number) {
  return (state: EditorState): number[] => {
    if (!isInTable(state)) {
      return [];
    }

    const rect = selectedRect(state);
    const cells = [];

    for (let i = index; i < rect.map.map.length; i += rect.map.width) {
      const cell = rect.tableStart + rect.map.map[i];
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

    for (let i = 0; i < rect.map.width; i += 1) {
      const cell = rect.tableStart + rect.map.map[index * rect.map.width + i];
      cells.push(cell);
    }
    return cells;
  };
}

export function isColumnSelected(index: number) {
  return (state: EditorState): boolean => {
    if (state.selection instanceof CellSelection) {
      if (state.selection.isColSelection()) {
        const rect = selectedRect(state);
        return rect.left <= index && rect.right > index;
      }
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

export function isRowSelected(index: number) {
  return (state: EditorState): boolean => {
    if (state.selection instanceof CellSelection) {
      if (state.selection.isRowSelection()) {
        const rect = selectedRect(state);
        return rect.top <= index && rect.bottom > index;
      }
    }

    return false;
  };
}

export function isTableSelected(state: EditorState): boolean {
  const rect = selectedRect(state);

  return (
    rect.top === 0 &&
    rect.left === 0 &&
    rect.bottom === rect.map.height &&
    rect.right === rect.map.width &&
    !state.selection.empty &&
    state.selection instanceof CellSelection
  );
}
