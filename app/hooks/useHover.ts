import React from "react";
import useUnmount from "./useUnmount";

const useHover = ({ duration }: { duration: number }) => {
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
