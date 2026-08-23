export const reportError = (
	error: unknown,
	context?: Record<string, unknown>,
) => {
	console.error("Global Error", error, context);
};

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

export const extractErrorMessage = (
	error: unknown,
	defaultMessage = "Terjadi kesalahan yang tidak terduga",
): string => {
	if (!error) return defaultMessage;

	try {
		let messageStr = "";

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
			if (messageStr.trim().startsWith("{")) {
				try {
					const parsed = JSON.parse(messageStr);
					if (parsed && typeof parsed === "object") {
						if (typeof parsed.message === "string") {
							return parsed.message;
						}
					}
				} catch {
				}
			}

			const jsonMatch = messageStr.match(/\{.*\}/);
			if (jsonMatch) {
				try {
					const parsed = JSON.parse(jsonMatch[0]);
					if (parsed && typeof parsed === "object") {
						if (typeof parsed.message === "string") {
							return parsed.message;
						}
					}
				} catch {
				}
			}

			return messageStr;
		}
	} catch {
	}

	return defaultMessage;
};
