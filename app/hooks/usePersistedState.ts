import { useState, useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Primitive } from "utility-types";
import Storage from "@shared/utils/Storage";
import { isBrowser } from "@shared/utils/browser";
import Logger from "~/utils/Logger";
import useEventListener from "./useEventListener";
import usePrevious from "./usePrevious";

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
): [T, Dispatch<SetStateAction<T>>] {
  const previousKey = usePrevious(key);
  const [storedValue, setStoredValue] = useState(() => {
    if (!isBrowser) {
      return defaultValue;
    }
    return Storage.get(key) ?? defaultValue;
  });

  const setValue = useCallback(
    (value: SetStateAction<T>) => {
      // Compute functional updates from the latest state rather than a value
      // captured in this closure, and keep the setter's identity stable so it
      // is safe to use in dependency arrays.
      setStoredValue((previousValue: T) => {
        const valueToStore =
          value instanceof Function ? value(previousValue) : value;
        Storage.set(key, valueToStore);
        return valueToStore;
      });
    },
    [key]
  );

  // Sync state when key changes
  useEffect(() => {
    if (previousKey !== undefined && previousKey !== key) {
      setStoredValue(Storage.get(key) ?? defaultValue);
    }
  }, [previousKey, key, defaultValue]);

  // Listen to the key changing in other tabs so we can keep UI in sync
  useEventListener("storage", (event: StorageEvent) => {
    if (options?.listen === false || event.key !== key) {
      return;
    }
    if (event.newValue === null) {
      setStoredValue(defaultValue);
      return;
    }
    try {
      setStoredValue(JSON.parse(event.newValue));
    } catch (error) {
      // Another tab or unrelated code may have written a value under this key
      // that is not valid JSON – never let that crash the listener.
      Logger.debug("misc", "Failed to parse persisted state", { error });
    }
  });

  return [storedValue, setValue];
}
