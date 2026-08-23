import { describe, expect, it } from "vitest";
import { generateSessionToken, hashSessionToken } from "./session-token";

describe("session token", () => {
	it("generates a non-empty, url-safe token", () => {
		const token = generateSessionToken();
		expect(token.length).toBeGreaterThan(20);
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it("generates a different token each call", () => {
		expect(generateSessionToken()).not.toBe(generateSessionToken());
	});

	it("hashes the same token to the same value", async () => {
		const token = generateSessionToken();
		const hashA = await hashSessionToken(token);
		const hashB = await hashSessionToken(token);
		expect(hashA).toBe(hashB);
	});

	it("hashes different tokens to different values", async () => {
		const hashA = await hashSessionToken(generateSessionToken());
		const hashB = await hashSessionToken(generateSessionToken());
		expect(hashA).not.toBe(hashB);
	});

	it("hash output is hex-encoded SHA-256 (64 hex chars)", async () => {
		const hash = await hashSessionToken(generateSessionToken());
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});
});
