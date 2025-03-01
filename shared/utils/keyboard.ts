import { isMac } from "./browser";

/**
 * Returns the display string for the alt key
 */
export const altDisplay = isMac() ? "⌥" : "Alt";

/**
 * Returns the display string for the meta key
 */
export const metaDisplay = isMac() ? "⌘" : "Ctrl";

/**
 * Returns the name of the modifier key
 */
export const meta = isMac() ? "cmd" : "ctrl";

/**
 * Returns true if the given event is a modifier key (Cmd or Ctrl on Mac, Alt on
 * @param event The event to check
 * @returns True if the event is a modifier key
 */
export function isModKey(
  event: KeyboardEvent | MouseEvent | React.KeyboardEvent
) {
  return isMac() ? event.metaKey : event.ctrlKey;
}

/**
 * Returns a string with the appropriate display strings for the given key
 *
 * @param key The key to display
 * @returns The display string for the key
 */
export function normalizeKeyDisplay(key: string) {
  return key
    .replace(/Meta/i, metaDisplay)
    .replace(/Cmd/i, metaDisplay)
    .replace(/Alt/i, altDisplay)
    .replace(/Control/i, metaDisplay)
    .replace(/Shift/i, "⇧");
}
