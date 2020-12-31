// @flow
const isMac = window.navigator.platform === "MacIntel";

export const metaDisplay = isMac ? "⌘" : "Ctrl";

export const meta = isMac ? "cmd" : "ctrl";

export function isMetaKey(event: KeyboardEvent | MouseEvent) {
  return isMac ? event.metaKey : event.ctrlKey;
}
