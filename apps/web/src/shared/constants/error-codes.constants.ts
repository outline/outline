export const DB_ERROR_CODES = {
	UNIQUE_VIOLATION: "23505",
	FOREIGN_KEY_VIOLATION: "23503",
	NOT_NULL_VIOLATION: "23502",
	CHECK_VIOLATION: "23514",
	INSUFFICIENT_PRIVILEGE: "42501",
	RAISE_EXCEPTION: "P0001",
	INVALID_TEXT_REPRESENTATION: "22P02",
	DEADLOCK_DETECTED: "40P01",
	SERIALIZATION_FAILURE: "40001",
} as const;

export const AUTH_ERROR_CODES = {
	INVALID_CREDENTIALS: "invalid_credentials",
	USER_ALREADY_EXISTS: "user_already_exists",
	WEAK_PASSWORD: "weak_password",
	EMAIL_NOT_CONFIRMED: "email_not_confirmed",
	OVER_EMAIL_SEND_RATE_LIMIT: "over_email_send_rate_limit",
	USER_NOT_FOUND: "user_not_found",
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
	// Database Errors
	[DB_ERROR_CODES.UNIQUE_VIOLATION]: "error.database.unique_violation",
	[DB_ERROR_CODES.FOREIGN_KEY_VIOLATION]:
		"error.database.foreign_key_violation",
	[DB_ERROR_CODES.NOT_NULL_VIOLATION]: "error.database.not_null_violation",
	[DB_ERROR_CODES.CHECK_VIOLATION]: "error.database.check_violation",
	[DB_ERROR_CODES.INSUFFICIENT_PRIVILEGE]:
		"error.database.insufficient_privilege",
	[DB_ERROR_CODES.INVALID_TEXT_REPRESENTATION]:
		"error.database.invalid_text_representation",
	[DB_ERROR_CODES.DEADLOCK_DETECTED]: "error.database.deadlock_detected",
	[DB_ERROR_CODES.SERIALIZATION_FAILURE]:
		"error.database.serialization_failure",

	// Auth Errors
	[AUTH_ERROR_CODES.INVALID_CREDENTIALS]: "error.auth.invalid_credentials",
	[AUTH_ERROR_CODES.USER_ALREADY_EXISTS]: "error.auth.user_already_exists",
	[AUTH_ERROR_CODES.WEAK_PASSWORD]: "error.auth.weak_password",
	[AUTH_ERROR_CODES.EMAIL_NOT_CONFIRMED]: "error.auth.email_not_confirmed",
	[AUTH_ERROR_CODES.OVER_EMAIL_SEND_RATE_LIMIT]:
		"error.auth.over_email_send_rate_limit",
	[AUTH_ERROR_CODES.USER_NOT_FOUND]: "error.auth.user_not_found",
};
