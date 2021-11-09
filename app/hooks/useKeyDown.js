// @flow
import * as React from "react";
import isTextInput from "utils/isTextInput";

export type KeyFilter = ((event: KeyboardEvent) => boolean) | string;

// Registered keyboard event callbacks
let callbacks = [];

// Track if IME input suggestions are open so we can ignore keydown shortcuts
// in this case, they should never be triggered from mobile keyboards.
let imeOpen = false;

// Based on implementation in react-use
// https://github.com/streamich/react-use/blob/master/src/useKey.ts#L15-L22
const createKeyPredicate = (keyFilter: KeyFilter) =>
  typeof keyFilter === "function"
    ? keyFilter
    : typeof keyFilter === "string"
    ? (event: KeyboardEvent) =>
        event.key === keyFilter ||
        event.code === `Key${keyFilter.toUpperCase()}`
    : keyFilter
    ? (_event) => true
    : (_event) => false;

export default function useKeyDown(
  key: KeyFilter,
  fn: (event: KeyboardEvent) => void
): void {
  const predicate = createKeyPredicate(key);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (predicate(event)) {
        fn(event);
      }
    };

    callbacks.push(handler);

    return () => {
      callbacks = callbacks.filter((cb) => cb !== handler);
    };
  }, []);
}

window.addEventListener("keydown", (event) => {
  if (imeOpen) {
    return;
  }

  // reverse so that the last registered callbacks get executed first
  for (const callback of callbacks.reverse()) {
    if (event.defaultPrevented === true) {
      break;
    }
    if (!isTextInput(event.target) || event.ctrlKey || event.metaKey) {
      callback(event);
    }
  }
});

window.addEventListener("compositionstart", () => {
  imeOpen = true;
});
window.addEventListener("compositionend", () => {
  imeOpen = false;
});
