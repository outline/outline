// Based on https://github.com/rehooks/window-scroll-position which is no longer
// maintained.
import throttle from "lodash/throttle";
import { useState, useEffect } from "react";
import { supportsPassiveListener } from "@shared/utils/browser";

const getPosition = () => ({
  x: window.pageXOffset,
  y: window.pageYOffset,
});

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
}): {
  x: number;
  y: number;
} {
  const opts = Object.assign({}, defaultOptions, options);
  const [position, setPosition] = useState(getPosition());

  useEffect(() => {
    const handleScroll = throttle(() => {
      setPosition(getPosition());
    }, opts.throttle);
    window.addEventListener(
      "scroll",
      handleScroll,
      supportsPassiveListener
        ? {
            passive: true,
          }
        : false
    );
    return () => {
      handleScroll.cancel();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [opts.throttle]);

  return position;
}
