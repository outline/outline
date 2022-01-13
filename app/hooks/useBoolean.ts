import * as React from "react";

type InitialState = boolean | (() => boolean);

/**
 * React hook to manage booleans
 *
 * @param initialState the initial boolean state value
 */
export default function useBoolean(
  initialState: InitialState = false
): [boolean, () => void, () => void] {
  const [value, setValue] = React.useState(initialState);
  const setTrue = React.useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = React.useCallback(() => {
    setValue(false);
  }, []);

  return [value, setTrue, setFalse];
}
