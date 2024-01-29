import { EditorState } from "prosemirror-state";
import { CellSelection, isInTable, selectedRect } from "prosemirror-tables";

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
    rect.right === rect.map.width
  );
}
