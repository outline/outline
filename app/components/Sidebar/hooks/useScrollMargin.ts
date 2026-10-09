import type { RefObject } from "react";
import { useLayoutEffect, useState } from "react";

/**
 * Tracks the offset of an element from the top of the content of a scroll
 * container, for use as the scroll margin of a virtualized list. The offset is
 * measured again when a direct child of the scroll container is resized, added
 * or removed, as these move the element without a scroll event.
 *
 * @param ref a ref to the element to measure.
 * @param scrollElement the scroll container that holds the element.
 * @returns the offset in pixels.
 */
export function useScrollMargin(
  ref: RefObject<HTMLElement | null>,
  scrollElement: HTMLElement | null
): number {
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !scrollElement) {
      return;
    }

    const measure = () => {
      setScrollMargin(
        element.getBoundingClientRect().top -
          scrollElement.getBoundingClientRect().top +
          scrollElement.scrollTop
      );
    };

    const resizeObserver = new ResizeObserver(measure);
    const observeChildren = () => {
      for (const child of scrollElement.children) {
        resizeObserver.observe(child);
      }
    };
    const mutationObserver = new MutationObserver(() => {
      observeChildren();
      measure();
    });

    measure();
    observeChildren();
    mutationObserver.observe(scrollElement, { childList: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref, scrollElement]);

  return scrollMargin;
}
