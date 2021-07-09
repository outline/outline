import { KeyboardEvent } from "react";
const isMac = window.navigator.platform === "MacIntel";

export const metaDisplay = isMac ? "⌘" : "Ctrl";

export const meta = isMac ? "cmd" : "ctrl";

export function isModKey(event: KeyboardEvent | MouseEvent | KeyboardEvent) {
  return isMac ? event.metaKey : event.ctrlKey;
}
