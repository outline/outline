// @flow
import * as React from "react";

export default function useDebounce(
  effect: (any) => any,
  delay: number,
  deps: any[]
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const callback = React.useCallback(effect, deps);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      callback();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [callback, delay]);
}
