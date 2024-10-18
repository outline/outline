import React from "react";
import useUnmount from "./useUnmount";

type Props = {
  /** Denotes the duration to wait until it's considered as a hover event. */
  duration: number;
};

/**
 * Hook to detect if an element is hovered by the user.
 *
 * This signals the hover only on the first time an element is hovered.
 *
 * @returns {Object} object - The returned object.
 * @returns {boolean} object.hovered - Signals when an element is hovered by the user.
 * @returns {function(): void} object.onMouseEnter - Attach this function to the observed element's onMouseEnter event handler.
 * @returns {function(): void} object.onMouseLeave - Attach this function to the observed element's onMouseLeave event handler.
 */
const useHover = ({ duration }: Props) => {
  const [hovered, setHovered] = React.useState(false);
  const timer = React.useRef<number>();

  const onMouseEnter = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = window.setTimeout(() => setHovered(true), duration);
  }, [duration]);

  const onMouseLeave = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  useUnmount(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  });

  return { hovered, onMouseEnter, onMouseLeave };
};

export default useHover;
