import * as React from "react";

export default function usePrevious<T>(value: T): T | void {
  const ref = React.useRef();

  React.useEffect(() => {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'T' is not assignable to type 'undefined'.
    ref.current = value;
  });
  return ref.current;
}
