import { useEffect, useState } from "react";

/**
 * Returns a value that only changes after the given value has stayed the same
 * for the wait time. The first value is returned at once.
 *
 * @param value the value to debounce.
 * @param wait the time in milliseconds the value must stay the same.
 * @returns the last value that stayed the same for the wait time.
 */
export default function useDebouncedValue<T>(value: T, wait: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), wait);
    return () => clearTimeout(timeout);
  }, [value, wait]);

  return debounced;
}
