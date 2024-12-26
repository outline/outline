import * as React from "react";
import { Primitive } from "utility-types";
import Storage from "@shared/utils/Storage";
import { isBrowser } from "@shared/utils/browser";
import Logger from "~/utils/Logger";
import useEventListener from "./useEventListener";

type Options = {
  /* Whether to listen and react to changes in the value from other tabs */
  listen?: boolean;
};

/**
 * Set a value in local storage and emit storage event to trigger render of any
 * listening mounted components.
 *
 * @param key Key to store value under
 * @param value Value to store
 */
export function setPersistedState<T extends Primitive | object>(
  key: string,
  value: T
) {
  Storage.set(key, value);
  window.dispatchEvent(
    new StorageEvent("storage", { key, newValue: JSON.stringify(value) })
  );
}

/**
 * A hook with the same API as `useState` that persists its value locally and
 * syncs the value between browser tabs.
 *
 * @param key Key to store value under
 * @param defaultValue An optional default value if no key exists
 * @param options Options for the hook
 * @returns Tuple of the current value and a function to update it
 */
export default function usePersistedState<T extends Primitive | object>(
  key: string,
  defaultValue: T,
  options?: Options
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = React.useState(() => {
    if (!isBrowser) {
      return defaultValue;
    }
    return Storage.get(key) ?? defaultValue;
  });

  const setValue = React.useCallback(
    (value: T | ((value: T) => void)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);
        Storage.set(key, valueToStore);
      } catch (error) {
        // A more advanced implementation would handle the error case
        Logger.debug("misc", "Failed to persist state", { error });
      }
    },
    [key, storedValue]
  );

  // Listen to the key changing in other tabs so we can keep UI in sync
  useEventListener("storage", (event: StorageEvent) => {
    if (options?.listen !== false && event.key === key && event.newValue) {
      setStoredValue(JSON.parse(event.newValue));
    }
  });

  return [storedValue, setValue];
}
