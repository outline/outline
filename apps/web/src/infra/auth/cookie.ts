import {
	deleteCookie,
	getCookie,
	getRequestHeader,
	setCookie,
} from "@tanstack/react-start/server";

export const SESSION_COOKIE_NAME = "session_token";

// 30 days, matching the sliding-expiration window used for the DB-side
// sessions.expiresAt column (see Task 5's touchSession).
const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// The session cookie's `secure` flag depends on whether the request is
// served over HTTPS, NOT on NODE_ENV. process.env.NODE_ENV is not defined
// in the Cloudflare Workers runtime and gets tree-shaken during SSR
// bundling — checking it here makes the conditional collapse to a literal
// at build time, which previously pinned `secure: true` even on local
// http://localhost. Read the `x-forwarded-proto` header (set by Cloudflare
// and most reverse proxies) at request time and decide per-request.
export function setSessionCookie(token: string): void {
	const proto = getRequestHeader("x-forwarded-proto") ?? "";
	const isHttps = proto === "https";
	setCookie(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		secure: isHttps,
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
	});
}

export function getSessionCookieValue(): string | undefined {
	return getCookie(SESSION_COOKIE_NAME);
}

export function clearSessionCookie(): void {
	deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
}
