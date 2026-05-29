import { closeHistory as pmCloseHistory } from "prosemirror-history";
import type { EditorView } from "prosemirror-view";
import { yUndoPluginKey } from "y-prosemirror";

/**
 * Closes the current history item so that subsequent changes start a new undo
 * group. Dispatches a closeHistory transaction for prosemirror-history and,
 * when multiplayer is enabled, stops capturing on the yjs undo manager.
 *
 * @param view The editor view.
 */
export function closeHistory(view: EditorView): void {
  view.dispatch(pmCloseHistory(view.state.tr));
  const yUndoState = yUndoPluginKey.getState(view.state);
  yUndoState?.undoManager?.stopCapturing();
}
