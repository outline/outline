const TOKEN_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** Opaque, unguessable session token — this is what goes in the cookie. */
export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
	return toBase64Url(bytes);
}

/**
 * SHA-256 of the token — this is what's stored in the sessions table.
 * Never store the raw token: a DB read (backup leak, SQL injection, etc.)
 * must not be enough to hijack a session.
 */
export async function hashSessionToken(token: string): Promise<string> {
	const data = new TextEncoder().encode(token);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return toHex(new Uint8Array(digest));
}
