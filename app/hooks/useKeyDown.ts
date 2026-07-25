import { useContext, useEffect } from "react";
import { isModKey } from "@shared/utils/keyboard";
import { SplitViewContext } from "~/components/SplitView/context";
import isTextInput from "~/utils/isTextInput";
import { getFocusedSplitPane } from "~/utils/splitView";

type Callback = (event: KeyboardEvent) => void;

export type KeyFilter = ((event: KeyboardEvent) => boolean) | string;

export type Options = {
  allowInInput?: boolean;
  /** Require the platform modifier key (Cmd on macOS, Ctrl elsewhere) to be held. */
  metaKey?: boolean;
  /** Require the Alt/Option key to be held. */
  altKey?: boolean;
  /** Require the Shift key to be held. */
  shiftKey?: boolean;
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

// Returns true when the event's modifier keys satisfy the given options.
const matchesModifiers = (event: KeyboardEvent, options?: Options) => {
  if (options?.metaKey ? !isModKey(event) : isModKey(event)) {
    return false;
  }
  if (options?.altKey && !event.altKey) {
    return false;
  }
  if (options?.shiftKey && !event.shiftKey) {
    return false;
  }
  return true;
};

// Based on implementation in react-use
// https://github.com/streamich/react-use/blob/master/src/useKey.ts#L15-L22
// A string filter matches the bare key with the modifiers described by options;
// use a function filter for anything the options cannot express.
const createKeyPredicate = (keyFilter: KeyFilter, options?: Options) =>
  typeof keyFilter === "function"
    ? keyFilter
    : typeof keyFilter === "string"
      ? (event: KeyboardEvent) => {
          // Match case-insensitively only when Shift is required, since a
          // shifted letter reports an uppercase event.key (e.g. Cmd+Shift+P).
          // Otherwise match exactly so a bare shortcut does not fire when Shift
          // is held (e.g. "n" must not trigger on Shift+N).
          const keyMatches = options?.shiftKey
            ? event.key.toLowerCase() === keyFilter.toLowerCase()
            : event.key === keyFilter;
          return keyMatches && matchesModifiers(event, options);
        }
      : keyFilter
        ? (_event: KeyboardEvent) => true
        : (_event: KeyboardEvent) => false;

/**
 * Registers a global keyboard shortcut for the lifetime of the component.
 *
 * @param key The key to match, either a string for a single key or a predicate
 * function for full control over the event.
 * @param fn The callback to invoke when the shortcut matches.
 * @param options Behavioral options, including the required modifier keys.
 */
export default function useKeyDown(
  key: KeyFilter,
  fn: Callback,
  options?: Options
): void {
  const { pane, isSplitView } = useContext(SplitViewContext);
  const predicate = createKeyPredicate(key, options);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Shortcuts registered within an unfocused split view pane are ignored
      // so that only the focused pane responds to them.
      if (isSplitView && pane !== getFocusedSplitPane()) {
        return;
      }

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
  }, [fn, predicate, options, isSplitView, pane]);
}

window.addEventListener("keydown", (event) => {
  if (imeOpen) {
    return;
  }

  // Track whether defaultPrevented was already set by an external handler (e.g.
  // Radix UI's DismissableLayer) so we only break on preventDefault calls made
  // by our own callbacks.
  const wasDefaultPrevented = event.defaultPrevented;

  // reverse so that the last registered callbacks get executed first
  for (const registered of [...callbacks].reverse()) {
    if (!wasDefaultPrevented && event.defaultPrevented) {
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
