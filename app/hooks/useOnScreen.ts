import * as React from "react";

const isSupported = "IntersectionObserver" in window;

// Parses a rootMargin string ("10px 20px" / "10px" / "10px 20px 30px 40px")
// into [top, right, bottom, left] in pixels. Percentages are not supported in
// the synchronous fast path and fall back to 0.
function parseRootMargin(
  rootMargin: string | undefined
): [number, number, number, number] {
  if (!rootMargin) {
    return [0, 0, 0, 0];
  }
  const parts = rootMargin
    .split(/\s+/)
    .map((p) => (p.endsWith("px") ? parseFloat(p) : 0));
  const [t = 0, r = t, b = t, l = r] = parts;
  return [t, r, b, l];
}

/**
 * Hook to track whether an element is visible on screen.
 *
 * @param options - intersection observer options.
 * @returns a tuple of a ref callback to attach to the element and a boolean
 * that is true when the element is visible.
 */
export default function useOnScreen(
  options?: IntersectionObserverInit
): [React.RefCallback<HTMLElement>, boolean] {
  const root = options?.root;
  const rootMargin = options?.rootMargin;
  const threshold = Array.isArray(options?.threshold)
    ? options?.threshold.join(",")
    : options?.threshold;

  const [isIntersecting, setIntersecting] = React.useState(!isSupported);

  const ref = React.useCallback(
    (element: HTMLElement | null) => {
      if (!element) {
        return;
      }

      // Synchronous initial check so the first paint is correct.
      const [mt, mr, mb, ml] = parseRootMargin(rootMargin);
      const rect = element.getBoundingClientRect();
      const rootRect =
        root instanceof Element
          ? root.getBoundingClientRect()
          : {
              top: 0,
              left: 0,
              bottom: window.innerHeight,
              right: window.innerWidth,
            };
      const initialVisible =
        rect.bottom >= rootRect.top - mt &&
        rect.top <= rootRect.bottom + mb &&
        rect.right >= rootRect.left - ml &&
        rect.left <= rootRect.right + mr;

      setIntersecting(initialVisible);

      if (!isSupported) {
        return;
      }

      const observer = new IntersectionObserver(([entry]) => {
        setIntersecting(entry.isIntersecting);
      }, options);
      observer.observe(element);

      return () => observer.disconnect();
    },
    // Re-create when option primitives change; options object identity ignored
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [root, rootMargin, threshold]
  );

  return [ref, isIntersecting];
}
