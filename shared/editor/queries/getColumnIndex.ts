import { CellSelection } from "prosemirror-tables";

export default function getColumnIndex(selection: CellSelection) {
  const isColSelection = selection.isColSelection && selection.isColSelection();
  if (!isColSelection) {
    return undefined;
  }

  const path = (selection.$from as any).path;
  return path[path.length - 5];
}
