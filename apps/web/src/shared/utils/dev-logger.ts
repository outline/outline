/**
 * Development-mode logger with structured output.
 * All functions are no-ops in production.
 */

const isDev =
	typeof import.meta !== "undefined" && import.meta.env?.DEV !== undefined
		? import.meta.env.DEV
		: typeof process !== "undefined"
			? process.env.NODE_ENV === "development"
			: false;

const styles = {
	error: "color: #ef4444; font-weight: bold;",
	warn: "color: #f59e0b; font-weight: bold;",
	info: "color: #3b82f6; font-weight: bold;",
	debug: "color: #8b5cf6;",
	success: "color: #10b981; font-weight: bold;",
	muted: "color: #6b7280; font-size: 11px;",
} as const;

export const devLog = {
	/**
	 * Log an error with full context (stack trace, cause, metadata).
	 */
	error: (title: string, error: unknown, context?: Record<string, unknown>) => {
		if (!isDev) return;
		console.groupCollapsed(`%c❌ ${title}`, styles.error);
		if (error instanceof Error) {
			console.error("Message:", error.message);
			if (error.stack) console.error("Stack:", error.stack);
			if (error.cause) console.error("Cause:", error.cause);
		} else {
			console.error("Raw:", error);
		}
		if (context) console.table(context);
		console.groupEnd();
	},

	/**
	 * Log a warning.
	 */
	warn: (title: string, detail?: unknown) => {
		if (!isDev) return;
		console.warn(`%c⚠️ ${title}`, styles.warn, detail ?? "");
	},

	/**
	 * Log an informational message.
	 */
	info: (title: string, data?: unknown) => {
		if (!isDev) return;
		console.log(`%cℹ️ ${title}`, styles.info, data ?? "");
	},

	/**
	 * Log a debug message (collapsed).
	 */
	debug: (title: string, data?: unknown) => {
		if (!isDev) return;
		console.log(`%c🔍 ${title}`, styles.debug, data ?? "");
	},

	/**
	 * Log a success message.
	 */
	success: (title: string, data?: unknown) => {
		if (!isDev) return;
		console.log(`%c✅ ${title}`, styles.success, data ?? "");
	},

	/**
	 * Log a server function call with timing.
	 */
	serverFn: (name: string, args?: unknown) => {
		if (!isDev) return;
		console.groupCollapsed(`%c📡 Server Function: ${name}`, styles.info);
		if (args !== undefined) console.log("Args:", args);
		console.log(`%c${new Date().toISOString()}`, styles.muted);
		console.groupEnd();
	},

	/**
	 * Log a server function error with full context.
	 */
	serverFnError: (name: string, error: unknown, args?: unknown) => {
		if (!isDev) return;
		console.groupCollapsed(
			`%c❌ Server Function Failed: ${name}`,
			styles.error,
		);
		if (args !== undefined) console.log("Args:", args);
		if (error instanceof Error) {
			console.error("Message:", error.message);
			if (error.stack) console.error("Stack:", error.stack);
			if (error.cause) console.error("Cause:", error.cause);
		} else {
			console.error("Raw:", error);
		}
		console.groupEnd();
	},

	/**
	 * Log an Effect program execution error.
	 */
	effectError: (programName: string, error: unknown) => {
		if (!isDev) return;
		console.groupCollapsed(
			`%c❌ Effect Program Failed: ${programName}`,
			styles.error,
		);
		if (error && typeof error === "object") {
			const e = error as Record<string, unknown>;
			if (e._tag) console.error("Tag:", e._tag);
			if (e.message) console.error("Message:", e.message);
			if (e.stack) console.error("Stack:", e.stack);

			// Try to extract from FiberFailure
			try {
				const toJSON = e.toJSON as (() => Record<string, unknown>) | undefined;
				const json = toJSON ? toJSON.call(e) : undefined;
				if (json?.cause) {
					console.error("FiberFailure cause:", json.cause);
				}
			} catch {
				// ignore if toJSON fails
			}
		} else {
			console.error("Raw:", error);
		}
		console.groupEnd();
	},

	/**
	 * Log a mutation/query lifecycle event.
	 */
	query: (
		type: "query" | "mutation",
		key: string,
		status: "start" | "success" | "error",
		data?: unknown,
	) => {
		if (!isDev) return;
		const icon = type === "query" ? "🔍" : "✏️";
		const statusIcon =
			status === "start" ? "⏳" : status === "success" ? "✅" : "❌";
		const color =
			status === "error"
				? styles.error
				: status === "success"
					? styles.success
					: styles.info;
		console.log(
			`%c${icon}${statusIcon} ${type}: ${key} [${status}]`,
			color,
			data ?? "",
		);
	},

	/**
	 * Group related logs together.
	 */
	group: (title: string, fn: () => void) => {
		if (!isDev) {
			fn();
			return;
		}
		console.groupCollapsed(`%c📋 ${title}`, styles.info);
		fn();
		console.groupEnd();
	},

	/**
	 * Log with timing.
	 */
	time: (label: string) => {
		if (!isDev) return;
		console.time(label);
		return () => {
			if (!isDev) return;
			console.timeEnd(label);
		};
	},
};
