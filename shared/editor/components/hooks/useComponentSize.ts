import { useState, useEffect } from "react";

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

export default function useComponentSize(
  element: HTMLElement | null
): DOMRect | typeof defaultRect {
  const [size, setSize] = useState(element?.getBoundingClientRect());

  useEffect(() => {
    const sizeObserver = new ResizeObserver((entries) => {
      entries.forEach(({ target }) => {
        const rect = target?.getBoundingClientRect();
        setSize((state) =>
          state?.width === rect?.width &&
          state?.height === rect?.height &&
          state?.x === rect?.x &&
          state?.y === rect?.y
            ? state
            : rect
        );
      });
    });

    if (element) {
      sizeObserver.observe(element);
    }

    return () => sizeObserver.disconnect();
  }, [element]);

  useEffect(() => {
    const handleResize = () => {
      const rect = element?.getBoundingClientRect();
      setSize((state) =>
        state?.width === rect?.width &&
        state?.height === rect?.height &&
        state?.x === rect?.x &&
        state?.y === rect?.y
          ? state
          : rect
      );
    };
    window.addEventListener("click", handleResize);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("click", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  });

  return size ?? defaultRect;
}
