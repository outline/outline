import * as React from "react";
// @ts-expect-error ts-migrate(2305) FIXME: Module '"reakit"' has no exported member 'ElementR... Remove this comment to see the full error message
import { ElementRef } from "reakit";
import "reakit";
import useMobile from "hooks/useMobile";
import useWindowSize from "hooks/useWindowSize";

const useMenuHeight = (
  visible: void | boolean,
  unstable_disclosureRef: void | {
    current: null | ElementRef<"button">;
  }
) => {
  const [maxHeight, setMaxHeight] = React.useState(undefined);
  const isMobile = useMobile();
  const { height: windowHeight } = useWindowSize();
  React.useLayoutEffect(() => {
    const padding = 8;

    if (visible && !isMobile) {
      setMaxHeight(
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'number | undefined' is not assig... Remove this comment to see the full error message
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
