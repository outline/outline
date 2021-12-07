import * as React from "react";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";

const useMenuHeight = (
  visible: void | boolean,
  unstable_disclosureRef?: React.RefObject<HTMLElement | null>
) => {
  const [maxHeight, setMaxHeight] = React.useState<number | undefined>();
  const isMobile = useMobile();
  const { height: windowHeight } = useWindowSize();

  React.useLayoutEffect(() => {
    const padding = 8;

    if (visible && !isMobile) {
      setMaxHeight(
        unstable_disclosureRef?.current
          ? windowHeight -
              unstable_disclosureRef.current.getBoundingClientRect().bottom -
              padding
          : undefined
      );
    }
  }, [visible, unstable_disclosureRef, windowHeight, isMobile]);
  return maxHeight;
};

export default useMenuHeight;
