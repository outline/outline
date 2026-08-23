import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
	it("verifies a correct password against its own hash", async () => {
		const hash = await hashPassword("correct horse battery staple");
		await expect(
			verifyPassword("correct horse battery staple", hash),
		).resolves.toBe(true);
	});

	it("rejects an incorrect password", async () => {
		const hash = await hashPassword("correct horse battery staple");
		await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
	});

	it("produces a different hash each time (random salt)", async () => {
		const hashA = await hashPassword("same password");
		const hashB = await hashPassword("same password");
		expect(hashA).not.toBe(hashB);
	});

	it("stored hash format is salt:hash, both hex", async () => {
		const hash = await hashPassword("some password");
		const parts = hash.split(":");
		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatch(/^[0-9a-f]+$/);
		expect(parts[1]).toMatch(/^[0-9a-f]+$/);
	});
});
