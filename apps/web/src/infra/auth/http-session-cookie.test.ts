import { describe, expect, it } from "vitest";
import {
	createExpiredSessionCookie,
	createSessionCookie,
	readSessionToken,
} from "./http-session-cookie";

describe("HTTP session cookie", () => {
	it("reads the session token from a request cookie", () => {
		const request = new Request("https://pet-store.test", {
			headers: { Cookie: "theme=dark; session_token=session-123" },
		});

		expect(readSessionToken(request)).toBe("session-123");
	});

	it("creates a secure http-only session cookie for HTTPS", () => {
		const request = new Request("https://pet-store.test", {
			headers: { "X-Forwarded-Proto": "https" },
		});

		expect(createSessionCookie(request, "session-123")).toContain(
			"session_token=session-123",
		);
		expect(createSessionCookie(request, "session-123")).toContain("Secure");
		expect(createSessionCookie(request, "session-123")).toContain("HttpOnly");
	});

	it("expires the session cookie on logout", () => {
		const request = new Request("http://pet-store.test");

		expect(createExpiredSessionCookie(request)).toContain("Max-Age=0");
	});
});
