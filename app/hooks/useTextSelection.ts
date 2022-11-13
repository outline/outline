import * as React from "react";
import useEventListener from "./useEventListener";

/**
 * A hook that returns the currently selected text.
 *
 * @returns The selected text
 */
export default function useTextSelection() {
  const [selection, setSelection] = React.useState<string>("");

  const handleMouse = React.useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString();
    setSelection(text ?? "");
  }, []);

  useEventListener("mousemove", handleMouse);
  useEventListener("mouseup", handleMouse);

  return selection;
}
