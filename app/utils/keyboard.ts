import { isMac } from "~/utils/browser";

export const metaDisplay = isMac() ? "⌘" : "Ctrl";

export const meta = isMac() ? "cmd" : "ctrl";

export function isModKey(
  event: KeyboardEvent | MouseEvent | React.KeyboardEvent
) {
  return isMac() ? event.metaKey : event.ctrlKey;
}
