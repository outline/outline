import * as React from "react";

interface WaypointOptions {
  /** Margin around the viewport in CSS margin syntax, e.g. "0px 0px 200px 0px". */
  rootMargin?: string;
}

/**
 * Hook to call a function when an element enters the viewport. The function is
 * also called on mount if the element is already in view. To check again after
 * the content changes, remount the element with a new key.
 *
 * @param onEnter - function to call when the element enters the viewport.
 * @param options - options for the observer.
 * @returns a ref callback to attach to the element.
 */
export default function useWaypoint(
  onEnter: (() => void) | undefined,
  options?: WaypointOptions
): React.RefCallback<HTMLElement> {
  const savedOnEnter = React.useRef(onEnter);
  const rootMargin = options?.rootMargin;

  React.useLayoutEffect(() => {
    savedOnEnter.current = onEnter;
  }, [onEnter]);

  return React.useCallback(
    (element: HTMLElement | null) => {
      if (!element || typeof IntersectionObserver === "undefined") {
        return;
      }

      let wasIntersecting = false;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !wasIntersecting) {
            savedOnEnter.current?.();
          }
          wasIntersecting = entry.isIntersecting;
        },
        { rootMargin }
      );
      observer.observe(element);
      return () => observer.disconnect();
    },
    [rootMargin]
  );
}
