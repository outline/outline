import * as React from "react";
import { Primitive } from "utility-types";

export default function usePersistedState(
  key: string,
  defaultValue: Primitive
) {
  const [storedValue, setStoredValue] = React.useState(() => {
    if (typeof window === "undefined") {
      return defaultValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.log(error);
      return defaultValue;
    }
  });

  const setValue = (value: Primitive | ((value: Primitive) => void)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  // Listen to the key changing in other tabs so we can keep UI in sync
  React.useEffect(() => {
    const updateValue = (event: any) => {
      if (event.key === key && event.newValue) {
        setStoredValue(JSON.parse(event.newValue));
      }
    };

    window.addEventListener("storage", updateValue);

    return () => window.removeEventListener("storage", updateValue);
  }, [key]);

  return [storedValue, setValue];
}
