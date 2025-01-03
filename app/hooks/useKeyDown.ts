import * as React from "react";
import { isModKey } from "@shared/utils/keyboard";
import isTextInput from "~/utils/isTextInput";

type Callback = (event: KeyboardEvent) => void;

export type KeyFilter = ((event: KeyboardEvent) => boolean) | string;

export type Options = {
  allowInInput?: boolean;
};

type RegisteredCallback = {
  callback: Callback;
  options?: Options;
};

// Registered keyboard event callbacks
let callbacks: RegisteredCallback[] = [];

// Track if IME input suggestions are open so we can ignore keydown shortcuts
// in this case, they should never be triggered from mobile keyboards.
let imeOpen = false;

// Based on implementation in react-use
// https://github.com/streamich/react-use/blob/master/src/useKey.ts#L15-L22
const createKeyPredicate = (keyFilter: KeyFilter) =>
  typeof keyFilter === "function"
    ? keyFilter
    : typeof keyFilter === "string"
    ? (event: KeyboardEvent) => event.key === keyFilter
    : keyFilter
    ? (_event: KeyboardEvent) => true
    : (_event: KeyboardEvent) => false;

export default function useKeyDown(
  key: KeyFilter,
  fn: Callback,
  options?: Options
): void {
  const predicate = createKeyPredicate(key);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (predicate(event)) {
        fn(event);
      }
    };

    callbacks.push({
      callback: handler,
      options,
    });

    return () => {
      callbacks = callbacks.filter((cb) => cb.callback !== handler);
    };
  }, [fn, predicate, options]);
}

window.addEventListener("keydown", (event) => {
  if (imeOpen) {
    return;
  }

  // reverse so that the last registered callbacks get executed first
  for (const registered of callbacks.reverse()) {
    if (event.defaultPrevented === true) {
      break;
    }

    if (
      !isTextInput(event.target as HTMLElement) ||
      registered.options?.allowInInput ||
      isModKey(event)
    ) {
      registered.callback(event);
    }
  }
});

window.addEventListener("compositionstart", () => {
  imeOpen = true;
});

window.addEventListener("compositionend", () => {
  imeOpen = false;
});
