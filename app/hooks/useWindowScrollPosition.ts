// Based on https://github.com/rehooks/window-scroll-position which is no longer
// maintained.
import { throttle } from "es-toolkit/compat";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { supportsPassiveListener } from "@shared/utils/browser";

type ScrollPosition = { x: number; y: number };

const defaultOptions = {
  throttle: 100,
};

/**
 * Hook to track the window's scroll position.
 *
 * @param options Configuration options
 * @param options.throttle Time in milliseconds to throttle the scroll event
 * @returns Object containing the current scroll position (x, y coordinates)
 */
export default function useWindowScrollPosition(options: {
  throttle: number;
}): ScrollPosition {
  const throttleMs = options.throttle ?? defaultOptions.throttle;

  // Cache the last object so getSnapshot returns a stable reference while the
  // position is unchanged, which useSyncExternalStore requires.
  const cache = useRef<ScrollPosition>({
    x: window.pageXOffset,
    y: window.pageYOffset,
  });

  const getSnapshot = useCallback(() => {
    const x = window.pageXOffset;
    const y = window.pageYOffset;
    if (x !== cache.current.x || y !== cache.current.y) {
      cache.current = { x, y };
    }
    return cache.current;
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleScroll = throttle(onStoreChange, throttleMs);
      window.addEventListener(
        "scroll",
        handleScroll,
        supportsPassiveListener ? { passive: true } : false
      );
      return () => {
        handleScroll.cancel();
        window.removeEventListener("scroll", handleScroll);
      };
    },
    [throttleMs]
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}
