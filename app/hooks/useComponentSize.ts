import { useState, useLayoutEffect } from "react";

export default function useComponentSize(
  ref: React.RefObject<HTMLElement | null>
): {
  width: number;
  height: number;
} {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const sizeObserver = new ResizeObserver((entries) => {
      entries.forEach(({ target }) => {
        if (
          size.width !== target.clientWidth ||
          size.height !== target.clientHeight
        ) {
          setSize({ width: target.clientWidth, height: target.clientHeight });
        }
      });
    });

    if (ref.current) {
      setSize({
        width: ref.current?.clientWidth,
        height: ref.current?.clientHeight,
      });
      sizeObserver.observe(ref.current);
    }

    return () => sizeObserver.disconnect();
  }, [ref, size.height, size.width]);

  return size;
}
