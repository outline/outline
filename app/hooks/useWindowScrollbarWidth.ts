import { useState, useEffect } from "react";

/**
 * Returns the width of the window's vertical scrollbar in pixels, or null
 * if not yet measured.
 *
 * @returns the scrollbar width, or null before measurement.
 */
export default function useWindowScrollbarWidth(): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    // Had to wait for the first paint, for <html> to
    // register overflow, otherwise scrollWidth and clientWidth ended up equal
    const timeout = setTimeout(() => {
      const html = window.document.documentElement;
      if (width === null) {
        setWidth(html.scrollWidth - html.clientWidth);
      }
    });
    return () => clearTimeout(timeout);
  }, []);

  return width;
}
