import throttle from "lodash/throttle";
import * as React from "react";
import useUnmount from "./useUnmount";

interface ThrottleSettings {
  leading?: boolean | undefined;
  trailing?: boolean | undefined;
}

const defaultOptions: ThrottleSettings = {
  leading: false,
  trailing: true,
};

/**
 * A hook that returns a throttled callback function.
 *
 * @param fn The function to throttle
 * @param wait The time in ms to wait before calling the function
 * @param dependencies The dependencies to watch for changes
 * @param options The throttle options
 */
export default function useThrottledCallback<T extends (...args: any[]) => any>(
  fn: T,
  wait = 250,
  dependencies: React.DependencyList = [],
  options: ThrottleSettings = defaultOptions
) {
  const handler = React.useMemo(
    () => throttle<T>(fn, wait, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies
  );

  useUnmount(() => {
    handler.cancel();
  });

  return handler;
}
