import { isMac } from "@shared/utils/browser";

export const altDisplay = isMac() ? "⌥" : "Alt";

export const metaDisplay = isMac() ? "⌘" : "Ctrl";

export const meta = isMac() ? "cmd" : "ctrl";

export function isModKey(
  event: KeyboardEvent | MouseEvent | React.KeyboardEvent
) {
  return isMac() ? event.metaKey : event.ctrlKey;
}
