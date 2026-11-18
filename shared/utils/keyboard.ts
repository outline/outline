import { isMac } from "./browser";

/**
 * Returns the display string for the alt key
 */
export const altDisplay = isMac ? "⌥" : "Alt";

/**
 * Returns the display string for the meta key
 */
export const metaDisplay = isMac ? "⌘" : "Ctrl";

/**
 * Returns the display string for the control key
 */
export const ctrlDisplay = isMac ? "^" : "Ctrl";

/**
 * Separator displayed between shortcut keys — "+" on Windows, empty on Mac.
 */
export const shortcutSeparator = isMac ? "" : "+";

/**
 * Returns the name of the modifier key
 */
export const meta = isMac ? "cmd" : "ctrl";

/**
 * Returns true if the given event is a modifier key (Cmd on Mac, Ctrl on other platforms).
 * @param event The event to check
 * @returns True if the event is a modifier key
 */
export function isModKey(
  event: KeyboardEvent | MouseEvent | React.KeyboardEvent
) {
  return isMac ? event.metaKey : event.ctrlKey;
}

/**
 * Returns a string with the appropriate display strings for the given key
 *
 * @param key The key to display
 * @param toUpperCase Whether to render single letters as uppercase
 * @returns The display string for the key
 */
export function normalizeKeyDisplay(key: string, toUpperCase?: boolean) {
  if (key.length === 1 && toUpperCase) {
    return key.toUpperCase();
  }

  return key
    .replace(/^Key([A-Z])$/i, (_, letter: string) =>
      toUpperCase ? letter.toUpperCase() : letter
    )
    .replace(/Meta/i, metaDisplay)
    .replace(/Cmd/i, metaDisplay)
    .replace(/Alt/i, altDisplay)
    .replace(/Control/i, ctrlDisplay)
    .replace(/Shift/i, "⇧");
}

/**
 * Returns true if the given keyboard event is for a key that produces a
 * character, as opposed to a named key such as "Enter", "Shift" or "F1".
 *
 * @param event The keyboard event to check.
 * @returns True if the key produces a character.
 */
export function isPrintableKeyEvent(event: Pick<KeyboardEvent, "key">) {
  return !/^[A-Z][A-Za-z0-9]+$/.test(event.key);
}
