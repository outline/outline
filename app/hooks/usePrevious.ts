import * as React from "react";

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
