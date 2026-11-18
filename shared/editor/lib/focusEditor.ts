import type { EditorView } from "prosemirror-view";

/**
 * Focus the editor if focus is elsewhere, for controls such as the table grips
 * that stay visible while focus is elsewhere. Focus in an open menu stays
 * there, as moving it would close the menu.
 *
 * @param view The editor view.
 */
export function focusEditor(view: EditorView): void {
  const { activeElement } = view.dom.ownerDocument;
  if (view.hasFocus() || activeElement?.closest("[role='menu']")) {
    return;
  }
  view.focus();
}
