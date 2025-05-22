import { useState } from "react";
import useEventListener from "./useEventListener";

/**
 * A hook that returns the currently selected text.
 *
 * @returns The selected text
 */
export default function useTextSelection() {
  const [selection, setSelection] = useState<string>("");

  useEventListener(
    "selectionchange",
    () => {
      const selection = window.getSelection();
      const text = selection?.toString();
      setSelection(text ?? "");
    },
    document
  );

  return selection;
}
