import * as React from "react";

type Callback = () => void;

/**
 * Hook to set up an interval that calls a callback.
 *
 * @param callback The callback to call.
 * @param delay The delay in milliseconds.
 */
export default function useInterval(callback: Callback, delay: number) {
  const savedCallback = React.useRef<Callback>();

  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  React.useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }

    return undefined;
  }, [delay]);
}
