import * as React from "react";

export default function usePrevious<T>(value: T): T | void {
  const ref = React.useRef<T>();

  React.useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}
