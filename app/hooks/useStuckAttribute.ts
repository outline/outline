import * as React from "react";

/**
 * Toggles a `data-stuck` attribute on a sticky element while it is stuck, so
 * that other elements, such as the app header, can style themselves to match.
 * The attribute is set on the DOM directly to avoid a re-render on scroll.
 *
 * @param ref the sticky element.
 * @param top the offset from the top of the viewport at which the element sticks.
 */
export function useStuckAttribute(
  ref: React.RefObject<HTMLElement | null>,
  top: number
) {
  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        element.toggleAttribute(
          "data-stuck",
          entry.isIntersecting &&
            entry.intersectionRatio < 1 &&
            entry.boundingClientRect.top <= top + 1
        );
      },
      { threshold: [0, 1], rootMargin: `-${top + 1}px 0px 0px 0px` }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      element.removeAttribute("data-stuck");
    };
  }, [ref, top]);
}
