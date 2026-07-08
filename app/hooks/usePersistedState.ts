import { useState, useCallback, useEffect, useRef } from "react";
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

  // Mirrors the latest state so functional updates can be computed without
  // capturing `storedValue` in the setter's closure, keeping its identity
  // stable and safe to use in dependency arrays.
  const storedValueRef = useRef<T>(storedValue);

  const updateStoredValue = useCallback((value: T) => {
    storedValueRef.current = value;
    setStoredValue(value);
  }, []);

  const setValue = useCallback(
    (value: SetStateAction<T>) => {
      const valueToStore =
        value instanceof Function ? value(storedValueRef.current) : value;
      updateStoredValue(valueToStore);
      Storage.set(key, valueToStore);
    },
    [key, updateStoredValue]
  );

  // Sync state when key changes
  useEffect(() => {
    if (previousKey !== undefined && previousKey !== key) {
      updateStoredValue(Storage.get(key) ?? defaultValue);
    }
  }, [previousKey, key, defaultValue, updateStoredValue]);

  // Listen to the key changing in other tabs so we can keep UI in sync
  useEventListener("storage", (event: StorageEvent) => {
    if (options?.listen === false || event.key !== key) {
      return;
    }
    if (event.newValue === null) {
      updateStoredValue(defaultValue);
      return;
    }
    try {
      updateStoredValue(JSON.parse(event.newValue));
    } catch (error) {
      // Another tab or unrelated code may have written a value under this key
      // that is not valid JSON – never let that crash the listener.
      Logger.debug("misc", "Failed to parse persisted state", { error });
    }
  });

  return [storedValue, setValue];
}
