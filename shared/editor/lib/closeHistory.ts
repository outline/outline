import {
  closeHistory as pmCloseHistory,
  redoDepth,
  undoDepth,
} from "prosemirror-history";
import type { EditorView } from "prosemirror-view";
import { yUndoPluginKey } from "y-prosemirror";

/**
 * Closes the current history item so that subsequent changes start a new undo
 * group. Dispatches a closeHistory transaction when prosemirror-history is
 * mounted and, when multiplayer is enabled, stops capturing on the Yjs undo
 * manager.
 *
 * @param view The editor view.
 */
export function closeHistory(view: EditorView): void {
  if (undoDepth(view.state) > 0 || redoDepth(view.state) > 0) {
    view.dispatch(pmCloseHistory(view.state.tr));
  }

  const yUndoState = yUndoPluginKey.getState(view.state);
  yUndoState?.undoManager?.stopCapturing();
}
