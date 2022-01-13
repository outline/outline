import { useState, useEffect } from "react";

export default function useComponentSize(
  ref: React.RefObject<HTMLElement>
): { width: number; height: number } {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
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
      sizeObserver.observe(ref.current);
    }

    return () => sizeObserver.disconnect();
  }, [ref]);

  return size;
}
