import * as React from "react";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";

const useMenuHeight = ({
  visible,
  elementRef,
  maxViewportHeight = 90,
  margin = 8,
}: {
  /** Whether the menu is visible. */
  visible: void | boolean;
  /** The maximum height of the menu as a percentage of the viewport. */
  maxViewportHeight?: number;
  /** A ref pointing to the element for the menu disclosure. */
  elementRef?: React.RefObject<HTMLElement | null>;
  /** The margin to apply to the positioning. */
  margin?: number;
}) => {
  const [maxHeight, setMaxHeight] = React.useState<number | undefined>(10);
  const isMobile = useMobile();
  const { height: windowHeight } = useWindowSize();

  React.useLayoutEffect(() => {
    if (visible && !isMobile) {
      const maxHeight = (windowHeight / 100) * maxViewportHeight;

      setMaxHeight(
        Math.min(
          maxHeight,
          elementRef?.current
            ? windowHeight -
                elementRef.current.getBoundingClientRect().bottom -
                margin
            : 0
        )
      );
    } else {
      setMaxHeight(0);
    }
  }, [visible, elementRef, windowHeight, margin, isMobile, maxViewportHeight]);

  return maxHeight;
};

export default useMenuHeight;
