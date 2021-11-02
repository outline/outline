// @flow
import * as React from "react";

export default function usePrevious<T>(value: T): T | void {
  const ref = React.useRef();
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
