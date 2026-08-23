const SENSITIVE_KEYS = new Set([
	"password",
	"passwordConfirm",
	"passwordHash",
	"password_hash",
	"secret",
	"secretKey",
	"secret_key",
	"client_secret",
	"apiKey",
	"api_key",
	"apiKeyHash",
	"key_hash",
	"token",
	"tokenHash",
	"token_hash",
	"authorization",
	"htmlBody",
	"html_body",
	"plainTextKey",
	"rawBody",
	"raw_body",
]);

const BEARER_REGEX = /(Bearer\s+)(\S+)/gi;

export const redact = <T>(value: T): T => {
	if (value === null || value === undefined) return value;
	if (typeof value === "string") return value;

	if (Array.isArray(value)) {
		return value.map(redact) as unknown as T;
	}

	if (typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
			if (SENSITIVE_KEYS.has(key)) {
				result[key] = "[REDACTED]";
			} else if (typeof val === "string") {
				if (key === "url" || key === "signedUrl") {
					result[key] = val.replace(
						/[?&](Signature|signature|X-Amz-Signature)=[^&\s]+/g,
						"$1=[REDACTED]",
					);
				} else if (key.toLowerCase().includes("auth") || key === "key") {
					result[key] = val.replace(BEARER_REGEX, "$1[REDACTED]");
					if (result[key] === val) {
						result[key] = "[REDACTED]";
					}
				} else {
					result[key] = val;
				}
			} else if (typeof val === "object") {
				result[key] = redact(val);
			} else {
				result[key] = val;
			}
		}
		return result as unknown as T;
	}

	return value;
};
