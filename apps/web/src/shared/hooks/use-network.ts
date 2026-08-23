import { useEffect, useState } from "react";

export type TNetworkStatus = {
	readonly isOnline: boolean;
	readonly isUnstable: boolean;
	readonly effectiveType?: "2g" | "3g" | "4g" | "slow-2g";
	readonly downlink?: number;
	readonly rtt?: number;
};

export function useNetwork() {
	const [status, setStatus] = useState<TNetworkStatus>(() => ({
		isOnline:
			typeof window !== "undefined" && typeof navigator !== "undefined"
				? navigator.onLine
				: true,
		isUnstable: false,
	}));

	useEffect(() => {
		if (typeof window === "undefined") return;

		const updateStatus = () => {
			const isOnline = navigator.onLine;
			// @ts-expect-error - navigator.connection is not standard but available in Chrome/Chromium
			const conn = navigator.connection;

			let isUnstable = false;
			if (conn) {
				const { effectiveType, downlink, rtt } = conn;
				// Consider 2g or slow-2g as unstable
				if (effectiveType === "2g" || effectiveType === "slow-2g") {
					isUnstable = true;
				}

				setStatus({
					isOnline,
					isUnstable: isOnline && isUnstable,
					effectiveType,
					downlink,
					rtt,
				});
			} else {
				setStatus((prev) => ({ ...prev, isOnline }));
			}
		};

		const handleOnline = () => updateStatus();
		const handleOffline = () => updateStatus();

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		// @ts-expect-error
		if (navigator.connection) {
			// @ts-expect-error
			navigator.connection.addEventListener("change", updateStatus);
		}

		// Initial check
		updateStatus();

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			// @ts-expect-error
			if (navigator.connection) {
				// @ts-expect-error
				navigator.connection.removeEventListener("change", updateStatus);
			}
		};
	}, []);

	return status;
}
