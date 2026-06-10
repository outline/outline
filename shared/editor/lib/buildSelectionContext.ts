import type { EditorState } from "prosemirror-state";
import { NodeSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { isInCode } from "../queries/isInCode";
import { isInList } from "../queries/isInList";
import { isInNotice } from "../queries/isInNotice";
import { getColumnIndex, getRowIndex, isTableSelected } from "../queries/table";
import { isMobile as isMobileDevice, isTouchDevice } from "../../utils/browser";
import type { SelectionContext } from "../types";

/**
 * Build a SelectionContext from the current editor state and options. This
 * object is computed once per toolbar render and shared across all menu
 * functions, eliminating repeated queries against the same state.
 *
 * @param state - the current prosemirror editor state.
 * @param options - additional context not derivable from editor state.
 * @returns a frozen selection context.
 */
export function buildSelectionContext(
  state: EditorState,
  options: { readOnly: boolean; isTemplate: boolean; rtl: boolean }
): SelectionContext {
  const { selection, schema } = state;

  return {
    state,
    schema,
    selection,
    isEmpty: selection.empty,
    isMobile: isMobileDevice(),
    isTouch: isTouchDevice(),
    readOnly: options.readOnly,
    isTemplate: options.isTemplate,
    rtl: options.rtl,
    isInCode: isInCode(state),
    isInCodeBlock: isInCode(state, { onlyBlock: true }),
    isInList: isInList(state),
    isInNotice: isInNotice(state),
    isTableCell: selection instanceof CellSelection,
    isTableSelected: isTableSelected(state),
    selectedNodeType:
      selection instanceof NodeSelection ? selection.node.type.name : undefined,
    colIndex: getColumnIndex(state),
    rowIndex: getRowIndex(state),
  };
}
