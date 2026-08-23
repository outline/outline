import { useRef } from "react";
import { gooeyToast, type GooeyToastOptions } from "goey-toast";

// Track active toast IDs by their deduplication key
const activeToastIds = new Map<string, string | number>();

function makeKey(title: string, description?: React.ReactNode): string {
	const desc =
		typeof description === "string"
			? description
				: description !== null && typeof description === "object"
					? JSON.stringify(description)
					: "";
	return `${title}::${desc}`;
}

function registerToast(title: string, description?: React.ReactNode, id?: string | number) {
	const key = makeKey(title, description);
	if (id !== undefined) {
		activeToastIds.set(key, id);
	}
	return key;
}

function unregisterToast(key: string) {
	activeToastIds.delete(key);
}

function isActive(title: string, description?: React.ReactNode): string | number | undefined {
	const key = makeKey(title, description);
	return activeToastIds.get(key);
}

// Wrapper around gooeyToast with deduplication
export const dedupToast = {
	/**
	 * Show a toast only if a toast with the same title + description is not already active.
	 * Returns the toast ID. If duplicate, returns the existing toast ID.
	 */
	show(title: string, options?: GooeyToastOptions) {
		const existingId = isActive(title, options?.description);
		if (existingId !== undefined) {
			return existingId;
		}
		const id = gooeyToast(title, {
			...options,
			id: options?.id ?? makeKey(title, options?.description),
			classNames: {
				...options?.classNames,
			},
			onDismiss: (dismissedId) => {
				unregisterToast(makeKey(title, options?.description));
				options?.onDismiss?.(dismissedId);
			},
			onAutoClose: (autoClosedId) => {
				unregisterToast(makeKey(title, options?.description));
				options?.onAutoClose?.(autoClosedId);
			},
		});
		registerToast(title, options?.description, id);
		return id;
	},

	success(title: string, options?: GooeyToastOptions) {
		const existingId = isActive(title, options?.description);
		if (existingId !== undefined) {
			return existingId;
		}
		const key = makeKey(title, options?.description);
		const id = gooeyToast.success(title, {
			...options,
			id: options?.id ?? key,
			onDismiss: (dismissedId) => {
				unregisterToast(key);
				options?.onDismiss?.(dismissedId);
			},
			onAutoClose: (autoClosedId) => {
				unregisterToast(key);
				options?.onAutoClose?.(autoClosedId);
			},
		});
		registerToast(title, options?.description, id);
		return id;
	},

	error(title: string, options?: GooeyToastOptions) {
		const existingId = isActive(title, options?.description);
		if (existingId !== undefined) {
			return existingId;
		}
		const key = makeKey(title, options?.description);
		const id = gooeyToast.error(title, {
			...options,
			id: options?.id ?? key,
			onDismiss: (dismissedId) => {
				unregisterToast(key);
				options?.onDismiss?.(dismissedId);
			},
			onAutoClose: (autoClosedId) => {
				unregisterToast(key);
				options?.onAutoClose?.(autoClosedId);
			},
		});
		registerToast(title, options?.description, id);
		return id;
	},

	warning(title: string, options?: GooeyToastOptions) {
		const existingId = isActive(title, options?.description);
		if (existingId !== undefined) {
			return existingId;
		}
		const key = makeKey(title, options?.description);
		const id = gooeyToast.warning(title, {
			...options,
			id: options?.id ?? key,
			onDismiss: (dismissedId) => {
				unregisterToast(key);
				options?.onDismiss?.(dismissedId);
			},
			onAutoClose: (autoClosedId) => {
				unregisterToast(key);
				options?.onAutoClose?.(autoClosedId);
			},
		});
		registerToast(title, options?.description, id);
		return id;
	},

	info(title: string, options?: GooeyToastOptions) {
		const existingId = isActive(title, options?.description);
		if (existingId !== undefined) {
			return existingId;
		}
		const key = makeKey(title, options?.description);
		const id = gooeyToast.info(title, {
			...options,
			id: options?.id ?? key,
			onDismiss: (dismissedId) => {
				unregisterToast(key);
				options?.onDismiss?.(dismissedId);
			},
			onAutoClose: (autoClosedId) => {
				unregisterToast(key);
				options?.onAutoClose?.(autoClosedId);
			},
		});
		registerToast(title, options?.description, id);
		return id;
	},

	dismiss: gooeyToast.dismiss,
	update: gooeyToast.update,
	promise: gooeyToast.promise,
};

// Re-export original for advanced use
export { gooeyToast as rawToast };

export type { GooeyToastOptions };

/**
 * React hook that provides a stable ref to dedupToast.
 * Usage: `const toast = useDedupToast()` in components.
 */
export function useDedupToast() {
	const ref = useRef(dedupToast);
	return ref.current;
}
