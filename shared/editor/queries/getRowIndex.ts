import { CellSelection } from "prosemirror-tables";

export default function getRowIndex(selection: CellSelection) {
  const isRowSelection = selection.isRowSelection && selection.isRowSelection();
  if (isRowSelection) {
    const path = (selection.$from as any).path;
    return path[path.length - 8];
  } else {
    const fromStr = selection.$from.toString();
    if (fromStr.includes("table")) {
      return Number(
        fromStr.substring(fromStr.indexOf("tr_") + 3, fromStr.indexOf("/td_"))
      );
    } else {
      return undefined;
    }
  }
}
