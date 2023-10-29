import * as React from "react";

/**
 * A hook to get the previous value of a variable.
 *
 * @param value The value to track.
 * @param onlyTruthy Whether to include only truthy values.
 * @returns The previous value of the variable.
 */
export default function usePrevious<T>(value: T, onlyTruthy = false): T | void {
  const ref = React.useRef<T>();

  React.useEffect(() => {
    if (onlyTruthy && !value) {
      return;
    }
    ref.current = value;
  });

  return ref.current;
}
