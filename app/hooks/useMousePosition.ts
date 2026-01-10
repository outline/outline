import { useState, useMemo } from "react";
import useEventListener from "./useEventListener";

/**
 * Mouse position as a tuple of [x, y]
 */
type MousePosition = [number, number];

/**
 * Hook to get the current mouse position
 *
 * @returns Mouse position as a tuple of [x, y]
 */
export const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState<MousePosition>([0, 0]);

  const updateMousePosition = useMemo(
    () => (ev: MouseEvent) => {
      setMousePosition([ev.clientX, ev.clientY]);
    },
    []
  );

  useEventListener("mousemove", updateMousePosition, undefined, {
    passive: true,
  });

  return mousePosition;
};
