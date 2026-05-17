import { useState } from "react";
import useEventListener from "./useEventListener";

/**
 * Returns the current selected text in the document.
 *
 * @returns the current selected text.
 */
export function getSelectedText() {
  return window.getSelection()?.toString() ?? "";
}

/**
 * A hook that returns the currently selected text.
 *
 * @returns The selected text
 */
export default function useTextSelection() {
  const [selection, setSelection] = useState(getSelectedText);

  useEventListener(
    "selectionchange",
    () => {
      setSelection(getSelectedText());
    },
    document
  );

  return selection;
}
