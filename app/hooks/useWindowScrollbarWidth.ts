import { useSyncExternalStore } from "react";

const subscribe = (onStoreChange: () => void) => {
  // Re-measure when the html element resizes (scrollbar appears/disappears).
  const resizeObserver = new ResizeObserver(onStoreChange);
  resizeObserver.observe(document.documentElement);
  return () => resizeObserver.disconnect();
};

const getSnapshot = (): number =>
  window.innerWidth - document.documentElement.clientWidth;

/**
 * Returns the width of the window's vertical scrollbar in pixels, or null
 * if not yet measured. Continuously re-measures as the scrollbar appears or
 * disappears.
 *
 * @returns the scrollbar width, or null before measurement.
 */
export default function useWindowScrollbarWidth(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
