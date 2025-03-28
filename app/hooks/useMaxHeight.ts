import * as React from "react";
import useWindowSize from "./useWindowSize";

/**
 * Hook to calculate the maximum height for an element based on its position and viewport size.
 *
 * @param options Configuration options
 * @param options.elementRef A ref pointing to the element to calculate max height for
 * @param options.maxViewportPercentage The maximum height of the element as a percentage of the viewport
 * @param options.margin The margin to apply to the positioning
 * @returns Object containing the calculated maxHeight and a function to recalculate it
 */
const useMaxHeight = ({
  elementRef,
  maxViewportPercentage = 90,
  margin = 16,
}: {
  /** The maximum height of the element as a percentage of the viewport. */
  maxViewportPercentage?: number;
  /** A ref pointing to the element. */
  elementRef?: React.RefObject<HTMLElement | null>;
  /** The margin to apply to the positioning. */
  margin?: number;
}) => {
  const [maxHeight, setMaxHeight] = React.useState<number | undefined>(10);
  const { height: windowHeight } = useWindowSize();

  const calcMaxHeight = React.useCallback(() => {
    if (elementRef?.current) {
      const mxHeight = (windowHeight / 100) * maxViewportPercentage - margin;

      setMaxHeight(
        Math.min(
          mxHeight,
          elementRef?.current
            ? windowHeight -
                elementRef.current.getBoundingClientRect().top -
                margin
            : 0
        )
      );
    } else {
      setMaxHeight(0);
    }
  }, [elementRef, windowHeight, margin, maxViewportPercentage]);

  React.useLayoutEffect(calcMaxHeight, [calcMaxHeight]);

  return { maxHeight, calcMaxHeight };
};

export default useMaxHeight;
