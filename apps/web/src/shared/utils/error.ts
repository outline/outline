import { ERROR_MESSAGES } from "@/shared/constants/error-codes.constants";
import { i18n } from "@/shared/i18n/i18n.config";
import { devLog } from "./dev-logger";

/**
 * Global error reporting utility.
 */
export const reportError = (
	error: unknown,
	context?: Record<string, unknown>,
) => {
	devLog.error("Global Error", error, context);
};

/**
 * Standardized error capture for async operations.
 */
export const captureError = <T>(
	promise: Promise<T>,
): Promise<[T | null, Error | null]> => {
	return promise
		.then((data): [T, null] => [data, null])
		.catch((err): [null, Error] => [
			null,
			err instanceof Error ? err : new Error(String(err)),
		]);
};

/**
 * Extracts a user-friendly error message from unknown error objects,
 * including parsing stringified JSON errors from the backend.
 */
export const extractErrorMessage = (
	error: unknown,
	defaultMessage = "Terjadi kesalahan yang tidak terduga",
): string => {
	devLog.debug("extractErrorMessage", { raw: error });
	if (!error) return defaultMessage;

	try {
		let messageStr = "";

		// Auth error structure sometimes has .code and .message directly on the error object
		if (error && typeof error === "object") {
			const errObj = error as Record<string, unknown>;
			if (errObj.code && ERROR_MESSAGES[errObj.code as string]) {
				return i18n.t(ERROR_MESSAGES[errObj.code as string] as string);
			}
		}

		if (error instanceof Error) {
			messageStr = error.message;
		} else if (typeof error === "string") {
			messageStr = error;
		} else if (
			typeof error === "object" &&
			error !== null &&
			"message" in error
		) {
			messageStr = String((error as Record<string, unknown>).message);
		}

		if (messageStr) {
			// Try to parse if it looks like JSON (e.g., from Effect/DB error)
			if (messageStr.trim().startsWith("{")) {
				try {
					const parsed = JSON.parse(messageStr);
					if (parsed && typeof parsed === "object") {
						if (parsed.code && ERROR_MESSAGES[parsed.code]) {
							return i18n.t(ERROR_MESSAGES[parsed.code] as string);
						}
						if (typeof parsed.message === "string") {
							return parsed.message;
						}
					}
				} catch {
					// Not valid JSON, continue
				}
			}

			// Try to extract if it looks like [cause]: Error: {"message": "..."}
			// Sometimes it comes nested
			const jsonMatch = messageStr.match(/\{.*\}/);
			if (jsonMatch) {
				try {
					const parsed = JSON.parse(jsonMatch[0]);
					if (parsed && typeof parsed === "object") {
						if (parsed.code && ERROR_MESSAGES[parsed.code]) {
							return i18n.t(ERROR_MESSAGES[parsed.code] as string);
						}
						if (typeof parsed.message === "string") {
							return parsed.message;
						}
					}
				} catch {
					// Not valid JSON, continue
				}
			}

			// Direct code matching for known unparsed codes in strings
			const directCodeMatch = messageStr.match(/"code"\s*:\s*"([^"]+)"/);
			if (directCodeMatch?.[1] && ERROR_MESSAGES[directCodeMatch[1]]) {
				return i18n.t(ERROR_MESSAGES[directCodeMatch[1]] as string);
			}

			return messageStr;
		}
	} catch {
		// Ignore extraction errors
	}

	return defaultMessage;
};
