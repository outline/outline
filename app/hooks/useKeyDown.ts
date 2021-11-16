import * as React from "react";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/isTextInput' or its corr... Remove this comment to see the full error message
import isTextInput from "utils/isTextInput";

export type KeyFilter = ((event: KeyboardEvent) => boolean) | string;
// Registered keyboard event callbacks
// @ts-expect-error ts-migrate(7034) FIXME: Variable 'callbacks' implicitly has type 'any[]' i... Remove this comment to see the full error message
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
    ? // @ts-expect-error ts-migrate(7006) FIXME: Parameter '_event' implicitly has an 'any' type.
      (_event) => true
    : // @ts-expect-error ts-migrate(7006) FIXME: Parameter '_event' implicitly has an 'any' type.
      (_event) => false;

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
      // @ts-expect-error ts-migrate(7005) FIXME: Variable 'callbacks' implicitly has an 'any[]' typ... Remove this comment to see the full error message
      callbacks = callbacks.filter((cb) => cb !== handler);
    };
  }, []);
}
window.addEventListener("keydown", (event) => {
  if (imeOpen) {
    return;
  }

  // reverse so that the last registered callbacks get executed first
  // @ts-expect-error ts-migrate(7005) FIXME: Variable 'callbacks' implicitly has an 'any[]' typ... Remove this comment to see the full error message
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
