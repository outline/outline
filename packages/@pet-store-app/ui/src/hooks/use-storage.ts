import { useCallback, useEffect, useState } from "react";
import { Storage } from "../utils/storage";

/**
 * Reactive hook for browser storage.
 */
export function useStorage<T>(key: string, initialValue: T) {
	const [storedValue, setStoredValue] = useState<T>(() => {
		const item = Storage.get<T>(key);
		return item !== null ? item : initialValue;
	});

	const setValue = useCallback(
		(value: T | ((val: T) => T)) => {
			const valueToStore =
				value instanceof Function ? value(storedValue) : value;
			setStoredValue(valueToStore);
			Storage.set(key, valueToStore);
		},
		[key, storedValue],
	);

	// Listen for changes in other tabs
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === key && e.newValue !== null) {
				setStoredValue(JSON.parse(e.newValue));
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [key]);

	return [storedValue, setValue] as const;
}
