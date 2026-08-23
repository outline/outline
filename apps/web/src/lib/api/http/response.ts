interface RestResponseMeta {
	readonly requestId: string;
}

interface RestSuccess<T> {
	readonly success: true;
	readonly data: T;
	readonly meta: RestResponseMeta;
}

interface RestFailure {
	readonly success: false;
	readonly error: {
		readonly code: string;
		readonly message: string;
		readonly fields?: Readonly<Record<string, string>>;
	};
	readonly meta: RestResponseMeta;
}

/** An HTTP error safe to expose through the REST API. */
export class ApiHttpError extends Error {
	public readonly status: number;
	public readonly code: string;
	public readonly fields: Readonly<Record<string, string>> | undefined;

	/**
	 * Creates a typed REST error.
	 *
	 * @param status the HTTP status to return.
	 * @param code the stable machine-readable error code.
	 * @param message the safe user-facing message.
	 * @param fields optional field-level validation messages.
	 */
	public constructor(
		status: number,
		code: string,
		message: string,
		fields?: Readonly<Record<string, string>>,
	) {
		super(message);
		this.name = "ApiHttpError";
		this.status = status;
		this.code = code;
		this.fields = fields;
	}
}

/**
 * Creates a successful JSON REST response.
 *
 * @param data the serializable response body.
 * @param requestId the request correlation identifier.
 * @param status the HTTP status, defaulting to 200.
 * @returns a JSON response with a consistent envelope.
 */
export function jsonSuccess<T>(
	data: T,
	requestId: string,
	status = 200,
): Response {
	const payload: RestSuccess<T> = {
		success: true,
		data,
		meta: { requestId },
	};
	return jsonResponse(payload, status, requestId);
}

/**
 * Creates a safe JSON REST error response.
 *
 * @param error the typed error to expose.
 * @param requestId the request correlation identifier.
 * @returns a JSON response containing the stable error envelope.
 */
export function jsonError(error: ApiHttpError, requestId: string): Response {
	const payload: RestFailure = {
		success: false,
		error: {
			code: error.code,
			message: error.message,
			...(error.fields ? { fields: error.fields } : {}),
		},
		meta: { requestId },
	};
	return jsonResponse(payload, error.status, requestId);
}

function jsonResponse<T>(payload: T, status: number, requestId: string) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"X-Request-Id": requestId,
		},
	});
}
