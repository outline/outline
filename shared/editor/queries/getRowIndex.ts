import { CellSelection } from "prosemirror-tables";

export default function getRowIndex(selection: CellSelection) {
  const isRowSelection = selection.isRowSelection && selection.isRowSelection();
  if (!isRowSelection) {
    return undefined;
  }

  const path = (selection.$from as any).path;
  return path[path.length - 8];
}

export function getRowIndexFromText(selection: CellSelection) {
  const isRowSelection = selection.isRowSelection && selection.isRowSelection();
  const path = (selection.$from as any).path;
  if (isRowSelection) {
    return path[path.length - 8];
  } else {
    return path[path.length - 11];
  }
}
