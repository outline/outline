import * as React from "react";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";

const useMenuHeight = (
  visible: void | boolean,
  unstable_disclosureRef?: React.RefObject<HTMLElement | null>,
  margin = 8
) => {
  const [maxHeight, setMaxHeight] = React.useState<number | undefined>();
  const isMobile = useMobile();
  const { height: windowHeight } = useWindowSize();

  React.useEffect(() => {
    if (visible && !isMobile) {
      setMaxHeight(
        unstable_disclosureRef?.current
          ? windowHeight -
              unstable_disclosureRef.current.getBoundingClientRect().bottom -
              margin
          : undefined
      );
    }
  }, [visible, unstable_disclosureRef, windowHeight, margin, isMobile]);
  return maxHeight;
};

export default useMenuHeight;
