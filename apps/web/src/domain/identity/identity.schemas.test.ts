import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { ChangePasswordSchema } from "./identity.schemas";

describe("ChangePasswordSchema", () => {
	it("accepts a valid password with 8+ characters", () => {
		const result = Schema.decodeUnknownSync(ChangePasswordSchema)({
			currentPassword: "old-secret-42",
			password: "new-secret-42",
		});
		expect(result).toEqual({
			currentPassword: "old-secret-42",
			password: "new-secret-42",
		});
	});

	it("rejects a password shorter than 8 characters", () => {
		expect(() =>
			Schema.decodeUnknownSync(ChangePasswordSchema)({
				currentPassword: "old-secret-42",
				password: "1234567",
			}),
		).toThrow();
	});

	it("rejects an empty password", () => {
		expect(() =>
			Schema.decodeUnknownSync(ChangePasswordSchema)({
				currentPassword: "old-secret-42",
				password: "",
			}),
		).toThrow();
	});

	it("rejects missing password field", () => {
		expect(() =>
			Schema.decodeUnknownSync(ChangePasswordSchema)({
				currentPassword: "old-secret-42",
			} as never),
		).toThrow();
	});

	it("rejects missing currentPassword field", () => {
		expect(() =>
			Schema.decodeUnknownSync(ChangePasswordSchema)({
				password: "new-secret-42",
			} as never),
		).toThrow();
	});

	it("rejects currentPassword shorter than 8 characters", () => {
		expect(() =>
			Schema.decodeUnknownSync(ChangePasswordSchema)({
				currentPassword: "1234567",
				password: "new-secret-42",
			}),
		).toThrow();
	});
});
