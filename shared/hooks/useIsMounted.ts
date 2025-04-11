import * as React from "react";

/**
 * Hook to check if component is still mounted
 *
 * @returns {boolean} true if the component is mounted, false otherwise
 */
export default function useIsMounted() {
  const isMounted = React.useRef(false);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return React.useCallback(() => isMounted.current, []);
}
