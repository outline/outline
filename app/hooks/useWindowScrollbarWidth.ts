import { useState, useEffect } from "react";

/**
 * Returns the width of the window's vertical scrollbar in pixels, or null
 * if not yet measured. Continuously re-measures as the scrollbar appears or
 * disappears.
 *
 * @returns the scrollbar width, or null before measurement.
 */
export default function useWindowScrollbarWidth(): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const htmlElement = document.documentElement;

    const measure = () => {
      const scrollbarWidth = htmlElement.scrollWidth - htmlElement.clientWidth;
      setWidth(scrollbarWidth);
    };

    // Defer initial measurement to after browser has painted
    const timeout = setTimeout(measure);

    // Re-measure when html element resizes (scrollbar appears/disappears)
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(htmlElement);

    return () => {
      clearTimeout(timeout);
      resizeObserver.disconnect();
    };
  }, []);

  return width;
}
