import * as React from "react";
import useUnmount from "./useUnmount";

/**
 * Hook to handle click intent logic with mouse enter/leave events.
 * Sets a timer on mouse enter to call the intent callback after a delay,
 * and clears the timer on mouse leave or component unmount.
 */
export default function useClickIntent(
  onClickIntent?: () => void,
  delay = 100
) {
  const timer = React.useRef<number>();

  const handleMouseEnter = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    if (onClickIntent) {
      timer.current = window.setTimeout(onClickIntent, delay);
    }
  }, [onClickIntent, delay]);

  const handleMouseLeave = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  useUnmount(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  });

  return { handleMouseEnter, handleMouseLeave };
}
