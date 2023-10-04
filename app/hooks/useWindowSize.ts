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
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const handleResize = useThrottledCallback(() => {
    setWindowSize((state) => {
      if (
        window.innerWidth === state.width &&
        window.innerHeight === state.height
      ) {
        return state;
      }

      return { width: window.innerWidth, height: window.innerHeight };
    });
  }, 100);

  useEventListener("resize", handleResize);

  // Call handler right away so state gets updated with initial window size
  React.useEffect(() => {
    handleResize();
  }, [handleResize]);

  return windowSize;
}
