import { EditorState } from "prosemirror-state";
import { CellSelection, isInTable } from "prosemirror-tables";
import {
  addRowAt,
  getCellsInColumn,
  moveRow,
  setTextSelection,
} from "prosemirror-utils";
import { getRowIndexFromText } from "../queries/getRowIndex";
import { Dispatch } from "../types";

/**
 * Adds a new table row at the current selection.
 *
 * @returns A prosemirror command.
 */
export default function addTableRow(state: EditorState, dispatch: Dispatch) {
  console.log("addTableRow");
  if (!isInTable(state)) {
    return false;
  }
  const index = getRowIndexFromText(
    state.selection as unknown as CellSelection
  );
  console.log("index", index);

  if (index === 0) {
    const cells = getCellsInColumn(0)(state.selection);
    if (!cells) {
      return false;
    }

    const tr = addRowAt(index + 2, true)(state.tr);
    dispatch(setTextSelection(cells[1].pos)(moveRow(index + 2, index + 1)(tr)));
  } else {
    dispatch(addRowAt(index + 1, true)(state.tr));
  }
  return true;
}
