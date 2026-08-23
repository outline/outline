export const SESSION_COOKIE_NAME = "session_token";

const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Reads the session token from an HTTP request.
 *
 * @param request the incoming request.
 * @returns the session token or undefined when absent.
 */
export function readSessionToken(request: Request): string | undefined {
	const cookieHeader = request.headers.get("Cookie");
	const cookie = cookieHeader
		?.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));

	if (!cookie) return undefined;
	const value = cookie.slice(`${SESSION_COOKIE_NAME}=`.length);
	return value ? decodeURIComponent(value) : undefined;
}

/**
 * Creates a session cookie for an HTTP response.
 *
 * @param request the request used to determine transport security.
 * @param token the opaque session token.
 * @returns a serialized Set-Cookie value.
 */
export function createSessionCookie(request: Request, token: string): string {
	const isHttps =
		(request.headers.get("X-Forwarded-Proto") ?? "").toLowerCase() ===
		"https";
	const secure = isHttps ? "; Secure" : "";
	return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

/**
 * Creates an expired cookie that removes the current session.
 *
 * @param request the request used to determine transport security.
 * @returns a serialized expired Set-Cookie value.
 */
export function createExpiredSessionCookie(request: Request): string {
	const isHttps =
		(request.headers.get("X-Forwarded-Proto") ?? "").toLowerCase() ===
		"https";
	const secure = isHttps ? "; Secure" : "";
	return `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
}
