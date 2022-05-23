import * as React from "react";
import { Primitive } from "utility-types";
import Logger from "~/utils/Logger";
import Storage from "~/utils/Storage";
import useEventListener from "./useEventListener";

/**
 * A hook with the same API as `useState` that persists its value locally and
 * syncs the value between browser tabs.
 *
 * @param key Key to store value under
 * @param defaultValue An optional default value if no key exists
 * @returns Tuple of the current value and a function to update it
 */
export default function usePersistedState(
  key: string,
  defaultValue: Primitive
) {
  const [storedValue, setStoredValue] = React.useState(() => {
    if (typeof window === "undefined") {
      return defaultValue;
    }
    return Storage.get(key) ?? defaultValue;
  });

  const setValue = (value: Primitive | ((value: Primitive) => void)) => {
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
  };

  // Listen to the key changing in other tabs so we can keep UI in sync
  useEventListener("storage", (event: StorageEvent) => {
    if (event.key === key && event.newValue) {
      setStoredValue(JSON.parse(event.newValue));
    }
  });

  return [storedValue, setValue];
}
