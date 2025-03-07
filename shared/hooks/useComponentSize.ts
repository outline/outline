import { useState, useLayoutEffect } from "react";

const defaultRect = {
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

/**
 * A hook that returns the size of an element or ref.
 *
 * @param input The element or ref to observe
 * @returns The size and position of the element
 */
export function useComponentSize(
  input: HTMLElement | null | React.RefObject<HTMLElement | null>
): DOMRect | typeof defaultRect {
  const element = input instanceof HTMLElement ? input : input?.current;
  const [size, setSize] = useState(() => element?.getBoundingClientRect());

  useLayoutEffect(() => {
    const sizeObserver = new ResizeObserver(() => {
      element?.dispatchEvent(new CustomEvent("resize"));
    });
    if (element) {
      sizeObserver.observe(element);
    }
    return () => sizeObserver.disconnect();
  }, [element]);

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

    return () => {
      window.removeEventListener("click", handleResize);
      window.removeEventListener("resize", handleResize);
      element?.removeEventListener("resize", handleResize);
    };
  });

  return size ?? defaultRect;
}
