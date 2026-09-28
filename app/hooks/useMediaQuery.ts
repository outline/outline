import { useCallback, useSyncExternalStore } from "react";
import { isBrowser } from "@shared/utils/browser";

const canMatch = (): boolean =>
  isBrowser && typeof window.matchMedia === "function";

const getServerSnapshot = (): boolean => false;

/**
 * Hook to check if a media query matches the current viewport.
 *
 * @param query The CSS media query to check against
 * @returns boolean indicating whether the media query matches
 */
export default function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!canMatch()) {
        return () => {};
      }
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => (canMatch() ? window.matchMedia(query).matches : false),
    [query]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
