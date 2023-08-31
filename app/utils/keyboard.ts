import { isMac } from "@shared/utils/browser";

export const altDisplay = isMac() ? "⌥" : "Alt";

export const metaDisplay = isMac() ? "⌘" : "Ctrl";

export const meta = isMac() ? "cmd" : "ctrl";

export function isModKey(
  event: KeyboardEvent | MouseEvent | React.KeyboardEvent
) {
  return isMac() ? event.metaKey : event.ctrlKey;
}

export function disableCopy(event: KeyboardEvent) {
  const key = event.key;
  if ((key === "c" || key === "x") && isModKey(event)) {
    event.preventDefault();
  }
}
