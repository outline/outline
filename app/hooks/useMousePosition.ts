import { throttle } from "lodash";
import * as React from "react";
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
  const [mousePosition, setMousePosition] = React.useState<MousePosition>([
    0,
    0,
  ]);

  const updateMousePosition = React.useMemo(
    () =>
      throttle((ev: MouseEvent) => {
        setMousePosition([ev.clientX, ev.clientY]);
      }, 200),
    []
  );

  useEventListener("mousemove", updateMousePosition);

  return mousePosition;
};
