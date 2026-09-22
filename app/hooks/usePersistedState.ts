import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Primitive } from "utility-types";
import Storage from "@shared/utils/Storage";
import { isBrowser } from "@shared/utils/browser";

type Options = {
  /* Whether to listen and react to changes in the value from other tabs */
  listen?: boolean;
};

// Same-tab subscribers, keyed by storage key. The native "storage" event only
// fires in other tabs, so this notifies hooks mounted in the current tab.
const localListeners = new Map<string, Set<() => void>>();

function subscribeLocal(key: string, callback: () => void) {
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

function emitLocal(key: string) {
  localListeners.get(key)?.forEach((callback) => callback());
}

/**
 * Set a value in local storage and notify any listening mounted components.
 *
 * @param key Key to store value under
 * @param value Value to store
 */
export function setPersistedState<T extends Primitive | object>(
  key: string,
  value: T
) {
  Storage.set(key, value);
  emitLocal(key);
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
  // Keep the default stable across rerenders of the same key so inline
  // defaults don't destabilise snapshots, but refresh it when the key changes
  // in case a new default is derived for the new key.
  const [keyForDefault, setKeyForDefault] = useState(key);
  const [keyDefault, setKeyDefault] = useState(defaultValue);
  if (keyForDefault !== key) {
    setKeyForDefault(key);
    setKeyDefault(defaultValue);
  }
  const listen = options?.listen;

  const read = useCallback(
    () => (isBrowser ? ((Storage.get(key) ?? keyDefault) as T) : keyDefault),
    [key, keyDefault]
  );

  // Cache the last value so getSnapshot returns a stable reference while the
  // serialized value is unchanged, which useSyncExternalStore requires.
  const cache = useRef<{ key: string; serialized: string; value: T } | null>(
    null
  );

  const getSnapshot = useCallback(() => {
    const value = read();
    const serialized = JSON.stringify(value) ?? "undefined";
    if (
      !cache.current ||
      cache.current.key !== key ||
      cache.current.serialized !== serialized
    ) {
      cache.current = { key, serialized, value };
    }
    return cache.current.value;
  }, [key, read]);

  const getServerSnapshot = useCallback(() => keyDefault, [keyDefault]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribeLocal = subscribeLocal(key, onStoreChange);
      if (listen === false) {
        return unsubscribeLocal;
      }
      // Cross-tab changes arrive as native storage events.
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) {
          onStoreChange();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        unsubscribeLocal();
        window.removeEventListener("storage", onStorage);
      };
    },
    [key, listen]
  );

  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setValue = useCallback(
    (value: SetStateAction<T>) => {
      const valueToStore = value instanceof Function ? value(read()) : value;
      setPersistedState(key, valueToStore);
    },
    [key, read]
  );

  return [storedValue, setValue];
}
