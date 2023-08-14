import throttle from "lodash/throttle";
import * as React from "react";
import useEventListener from "./useEventListener";
import useIsMounted from "./useIsMounted";

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
  const isMounted = useIsMounted();
  const [mousePosition, setMousePosition] = React.useState<MousePosition>([
    0, 0,
  ]);

  const updateMousePosition = React.useMemo(
    () =>
      throttle((ev: MouseEvent) => {
        if (isMounted()) {
          setMousePosition([ev.clientX, ev.clientY]);
        }
      }, 200),
    [isMounted]
  );

  useEventListener("mousemove", updateMousePosition);

  return mousePosition;
};
