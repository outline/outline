import { throttle } from "es-toolkit/compat";
import { useCallback, useRef, useSyncExternalStore } from "react";

type WindowSize = { width: number; height: number };

const readSize = (): WindowSize => ({
  width: window.visualViewport?.width || window.innerWidth,
  height: window.visualViewport?.height || window.innerHeight,
});

/**
 * A throttled hook that listens to the window resize event and returns the
 * size of the current window.
 *
 * @returns An object containing width and height of the current window
 */
export default function useWindowSize(): WindowSize {
  // Cache the last object so getSnapshot returns a stable reference while the
  // size is unchanged, which useSyncExternalStore requires.
  const cache = useRef<WindowSize>(readSize());

  const getSnapshot = useCallback(() => {
    const next = readSize();
    if (
      next.width !== cache.current.width ||
      next.height !== cache.current.height
    ) {
      cache.current = next;
    }
    return cache.current;
  }, []);

  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleResize = throttle(onStoreChange, 100);
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      handleResize.cancel();
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}
