import type { EditorView } from "prosemirror-view";

/**
 * Focus the editor if it does not have focus, for controls such as the table
 * grips that stay visible while focus is elsewhere.
 *
 * @param view The editor view.
 */
export function focusEditor(view: EditorView): void {
  if (!view.hasFocus()) {
    view.focus();
  }
}
