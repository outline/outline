import { CellSelection } from "prosemirror-tables";

export default function getRowIndex(selection: CellSelection) {
  const isRowSelection = selection.isRowSelection && selection.isRowSelection();
  if (!isRowSelection) {
    return undefined;
  }

  const path = (selection.$from as any).path;
  return path[path.length - 8];
}
