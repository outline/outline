import { useState, useCallback } from "react";

type InitialState = boolean | (() => boolean);

/**
 * React hook to manage booleans
 *
 * @param initialState the initial boolean state value
 */
export default function useBoolean(
  initialState: InitialState = false
): [boolean, () => void, () => void] {
  const [value, setValue] = useState(initialState);
  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return [value, setTrue, setFalse];
}
