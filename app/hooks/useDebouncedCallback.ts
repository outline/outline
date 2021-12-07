import * as React from "react";

export default function useDebouncedCallback(
  callback: (arg0: any) => unknown,
  wait: number
) {
  // track args & timeout handle between calls
  const argsRef = React.useRef();
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();

  function cleanup() {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
  }

  // make sure our timeout gets cleared if consuming component gets unmounted
  React.useEffect(() => cleanup, []);
  return function (...args: any) {
    argsRef.current = args;
    cleanup();
    timeout.current = setTimeout(() => {
      if (argsRef.current) {
        // @ts-expect-error ts-migrate(2556) FIXME: Expected 1 arguments, but got 0 or more.
        callback(...argsRef.current);
      }
    }, wait);
  };
}
