import React from "react";
import useUnmount from "./useUnmount";

type Props = {
  /** Ref to the element that needs to be observed. */
  ref: React.RefObject<HTMLElement>;
  /** Duration to wait until it's considered as a hover event. */
  duration: number;
};

/**
 * Hook that will trigger the first time an element is hovered.
 *
 * @returns {boolean} hovered - Signals when an element is hovered by the user.
 */
const useHover = ({ ref, duration }: Props): boolean => {
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

  React.useEffect(() => {
    if (ref.current) {
      ref.current.onmouseenter = onMouseEnter;
      ref.current.onmouseleave = onMouseLeave;
    }
  }, [ref, onMouseEnter, onMouseLeave]);

  return hovered;
};

export default useHover;
