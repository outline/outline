import { useState, useLayoutEffect } from "react";

/**
 * A hook that returns the size of an element or ref.
 *
 * @param input The element or ref to observe
 * @returns The size and position of the element
 */
export function useComponentSize(
  input: HTMLElement | null | React.RefObject<HTMLElement | null>
) {
  const element = input instanceof HTMLElement ? input : input?.current;
  const [size, setSize] = useState<DOMRect | undefined>(
    () => element?.getBoundingClientRect() || new DOMRect()
  );

  useLayoutEffect(() => {
    const handleResize = () => {
      setSize((state) => {
        const rect = element?.getBoundingClientRect();

        if (
          rect &&
          state &&
          Math.round(state.width) === Math.round(rect.width) &&
          Math.round(state.height) === Math.round(rect.height) &&
          Math.round(state.x) === Math.round(rect.x) &&
          Math.round(state.y) === Math.round(rect.y)
        ) {
          return state;
        }
        return rect;
      });
    };

    window.addEventListener("click", handleResize);
    window.addEventListener("resize", handleResize);
    element?.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("click", handleResize);
      window.removeEventListener("resize", handleResize);
      element?.removeEventListener("resize", handleResize);
    };
  });

  useLayoutEffect(() => {
    const sizeObserver = new ResizeObserver(() => {
      element?.dispatchEvent(new CustomEvent("resize"));
    });
    if (element) {
      sizeObserver.observe(element);
    }
    return () => sizeObserver.disconnect();
  }, [element]);

  return size ?? new DOMRect();
}
