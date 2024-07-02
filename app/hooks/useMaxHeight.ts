import * as React from "react";
import useMobile from "./useMobile";
import useWindowSize from "./useWindowSize";

const useMaxHeight = ({
  elementRef,
  maxViewportHeight = 90,
  margin = 8,
}: {
  /** The maximum height of the element as a percentage of the viewport. */
  maxViewportHeight?: number;
  /** A ref pointing to the element. */
  elementRef?: React.RefObject<HTMLElement | null>;
  /** The margin to apply to the positioning. */
  margin?: number;
}) => {
  const [maxHeight, setMaxHeight] = React.useState<number | undefined>(10);
  const isMobile = useMobile();
  const { height: windowHeight } = useWindowSize();

  React.useLayoutEffect(() => {
    if (!isMobile && elementRef?.current) {
      const mxHeight = (windowHeight / 100) * maxViewportHeight;

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
  }, [elementRef, windowHeight, margin, isMobile, maxViewportHeight]);

  return maxHeight;
};

export default useMaxHeight;
