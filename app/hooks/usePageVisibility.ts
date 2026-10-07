import { useSyncExternalStore } from "react";

const subscribe = (onStoreChange: () => void) => {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
};

const getSnapshot = () => !document.hidden;

/**
 * Hook to return page visibility state.
 *
 * @returns boolean if the page is visible
 */
export default function usePageVisibility(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
