import * as React from "react";
import useDebouncedCallback from "./useDebouncedCallback";
import useEventListener from "./useEventListener";

/**
 * A debounced hook that listens to the window resize event and returns the
 * size of the current window.
 *
 * @returns An object containing width and height of the current window
 */
export default function useWindowSize() {
  const [windowSize, setWindowSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const handleResize = useDebouncedCallback(() => {
    if (
      window.innerWidth !== windowSize.width ||
      window.innerHeight !== windowSize.height
    ) {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  }, 100);

  useEventListener("resize", handleResize);

  // Call handler right away so state gets updated with initial window size
  handleResize();

  return windowSize;
}
