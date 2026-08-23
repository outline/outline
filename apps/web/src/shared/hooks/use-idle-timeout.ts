import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "./use-session";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function useIdleTimeout() {
	const { session } = useSession();
	const [isIdle, setIsIdle] = useState(false);
	const hasPinSet = session?.hasPinSet ?? false;
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const lockApp = useCallback(() => {
		if (session && !isIdle) {
			setIsIdle(true);
		}
	}, [session, isIdle]);

	const resetTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		// Only start timer if not currently idle
		if (!isIdle && session) {
			timerRef.current = setTimeout(lockApp, IDLE_TIMEOUT_MS);
		}
	}, [isIdle, session, lockApp]);

	useEffect(() => {
		if (!session) {
			if (timerRef.current) clearTimeout(timerRef.current);
			setIsIdle(false);
			return;
		}

		const handleActivity = () => resetTimer();

		// Set up event listeners
		window.addEventListener("mousemove", handleActivity);
		window.addEventListener("keydown", handleActivity);
		window.addEventListener("click", handleActivity);
		window.addEventListener("scroll", handleActivity);

		// Initial start
		resetTimer();

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			window.removeEventListener("mousemove", handleActivity);
			window.removeEventListener("keydown", handleActivity);
			window.removeEventListener("click", handleActivity);
			window.removeEventListener("scroll", handleActivity);
		};
	}, [resetTimer, session]);

	const unlock = () => {
		setIsIdle(false);
		resetTimer();
	};

	return { isIdle, unlock, lock: lockApp, hasPinSet };
}
