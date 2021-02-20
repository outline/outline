// @flow
import * as React from "react";

export default function useStickyState<T>(
  defaultValue: ?T,
  key: string
): [?T, (T) => void] {
  const [value, setValue] = React.useState<?T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });

  React.useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
