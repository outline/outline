import * as React from "react";

export default function useDebouncedCallback<T>(
  callback: (...params: T[]) => unknown,
  wait: number
) {
  // track args & timeout handle between calls
  const argsRef = React.useRef<T[]>();
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();

  function cleanup() {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
  }

  // make sure our timeout gets cleared if consuming component gets unmounted
  React.useEffect(() => cleanup, []);
  return function (...args: T[]) {
    argsRef.current = args;
    cleanup();
    timeout.current = setTimeout(() => {
      if (argsRef.current) {
        callback(...argsRef.current);
      }
    }, wait);
  };
}
