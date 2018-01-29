// @flow

/**
 * Detect Cmd or Ctrl by platform for keyboard shortcuts
 */
export function isModKey(event: SyntheticKeyboardEvent) {
  const isMac =
    typeof window !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
  return isMac ? event.metaKey : event.ctrlKey;
}
