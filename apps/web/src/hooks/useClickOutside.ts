import { type RefObject, useEffect } from "react";

type ClickOutsideOptions = {
	ref: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[];
	callback: (event: MouseEvent | TouchEvent) => void;
	enabled?: boolean;
};

export function useClickOutside({
	ref,
	callback,
	enabled = true,
}: ClickOutsideOptions) {
	useEffect(() => {
		if (!enabled) return;

		const handler = (event: MouseEvent | TouchEvent) => {
			const target = event.target as Node;
			const refs = Array.isArray(ref) ? ref : [ref];

			const isInside = refs.some((r) => r.current?.contains(target));
			if (!isInside) {
				callback(event);
			}
		};

		document.addEventListener("mousedown", handler);
		document.addEventListener("touchstart", handler);

		return () => {
			document.removeEventListener("mousedown", handler);
			document.removeEventListener("touchstart", handler);
		};
	}, [ref, callback, enabled]);
}
