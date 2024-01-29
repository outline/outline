import * as React from "react";
import useEventListener from "./useEventListener";
import useThrottledCallback from "./useThrottledCallback";

/**
 * A debounced hook that listens to the window resize event and returns the
 * size of the current window.
 *
 * @returns An object containing width and height of the current window
 */
export default function useWindowSize() {
  const [windowSize, setWindowSize] = React.useState({
    width: window.visualViewport?.width || window.innerWidth,
    height: window.visualViewport?.height || window.innerHeight,
  });

  const handleResize = useThrottledCallback(() => {
    const width = window.visualViewport?.width || window.innerWidth;
    const height = window.visualViewport?.height || window.innerHeight;

    setWindowSize((state) => {
      if (width === state.width && height === state.height) {
        return state;
      }

      return { width, height };
    });
  }, 100);

  useEventListener("resize", handleResize);
  useEventListener("resize", handleResize, window.visualViewport);

  // Call handler right away so state gets updated with initial window size
  React.useEffect(() => {
    handleResize();
  }, [handleResize]);

  return windowSize;
}
