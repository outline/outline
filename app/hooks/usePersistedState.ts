import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Primitive } from "utility-types";
import Storage from "@shared/utils/Storage";
import { isBrowser } from "@shared/utils/browser";

type Options = {
  /* Whether to listen and react to changes in the value from other tabs */
  listen?: boolean;
};

type PersistedValue = Primitive | object;
type LocalListener = (value: PersistedValue) => void;

interface PersistedState<T> {
  key: string;
  defaultValue: T;
  value: T;
}

// Same-tab subscribers, keyed by storage key. Pass the value directly so a
// failed storage write does not prevent mounted hooks from updating.
const localListeners = new Map<string, Set<LocalListener>>();

function subscribeLocal(key: string, callback: LocalListener) {
  let set = localListeners.get(key);
  if (!set) {
    set = new Set();
    localListeners.set(key, set);
  }
  set.add(callback);
  return () => {
    set.delete(callback);
    if (set.size === 0) {
      localListeners.delete(key);
    }
  };
}

/**
 * Set a value in local storage and notify any listening mounted components.
 *
 * @param key key to store the value under.
 * @param value value to store.
 * @returns nothing.
 */
export function setPersistedState<T extends PersistedValue>(
  key: string,
  value: T
) {
  Storage.set(key, value);
  localListeners.get(key)?.forEach((callback) => callback(value));
}

/**
 * A hook with the same API as `useState` that persists its value locally and
 * syncs the value between browser tabs.
 *
 * @param key key to store the value under.
 * @param defaultValue default value if no key exists.
 * @param options options for the hook.
 * @returns the current value and a function to update it.
 */
export default function usePersistedState<T extends PersistedValue>(
  key: string,
  defaultValue: T,
  options?: Options
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<PersistedState<T>>(() => ({
    key,
    defaultValue,
    value: isBrowser ? (Storage.get(key) ?? defaultValue) : defaultValue,
  }));
  const storedValueRef = useRef(state.value);

  // Reset before rendering children when the key changes, while keeping inline
  // defaults and the setter stable for the lifetime of each key.
  if (state.key !== key) {
    const value: T = isBrowser
      ? (Storage.get(key) ?? defaultValue)
      : defaultValue;
    setState({ key, defaultValue, value });
  }

  useLayoutEffect(() => {
    storedValueRef.current = state.value;
  }, [state.value]);

  const updateStoredValue = useCallback((value: T) => {
    storedValueRef.current = value;
    setState((previous) =>
      Object.is(previous.value, value) ? previous : { ...previous, value }
    );
  }, []);

  const listen = options?.listen;
  const keyDefault = state.defaultValue;

  useEffect(() => {
    const unsubscribeLocal = subscribeLocal(key, (value) => {
      updateStoredValue(value as T);
    });
    if (listen === false) {
      return unsubscribeLocal;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        updateStoredValue(Storage.get(key) ?? keyDefault);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      unsubscribeLocal();
      window.removeEventListener("storage", handleStorage);
    };
  }, [key, keyDefault, listen, updateStoredValue]);

  const setValue = useCallback(
    (value: SetStateAction<T>) => {
      const valueToStore =
        value instanceof Function ? value(storedValueRef.current) : value;
      updateStoredValue(valueToStore);
      setPersistedState(key, valueToStore);
    },
    [key, updateStoredValue]
  );

  return [state.value, setValue];
}
