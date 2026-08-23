/**
 * Safe wrapper for browser storage (localStorage).
 * Handles JSON parsing and prevents SSR errors.
 */
export const Storage = {
	get: <T>(key: string): T | null => {
		if (typeof window === "undefined") return null;
		try {
			const item = localStorage.getItem(key);
			return item ? JSON.parse(item) : null;
		} catch (e) {
			console.error(`Error reading storage key "${key}":`, e);
			return null;
		}
	},

	set: <T>(key: string, value: T): void => {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (e) {
			console.error(`Error writing storage key "${key}":`, e);
		}
	},

	remove: (key: string): void => {
		if (typeof window === "undefined") return;
		localStorage.removeItem(key);
	},

	clear: (): void => {
		if (typeof window === "undefined") return;
		localStorage.clear();
	},
} as const;
