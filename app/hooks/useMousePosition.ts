import { throttle } from "lodash";
import * as React from "react";

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
  const [mousePosition, setMousePosition] = React.useState<MousePosition>([
    0,
    0,
  ]);

  const updateMousePosition = throttle((ev: MouseEvent) => {
    setMousePosition([ev.clientX, ev.clientY]);
  }, 200);

  React.useEffect(() => {
    window.addEventListener("mousemove", updateMousePosition);

    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  return mousePosition;
};
