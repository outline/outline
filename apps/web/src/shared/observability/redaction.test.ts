import { describe, expect, it } from "vitest";
import { redact } from "./redaction";

describe("redact", () => {
	it("should redact Bearer tokens", () => {
		const input = { auth: "Bearer sk_live_abc123def456" };
		const result = redact(input);
		expect(result.auth).toBe("Bearer [REDACTED]");
	});

	it("should redact API keys in any field named key, apiKey, token", () => {
		expect(redact({ apiKey: "psk_a1b2c3d4e5f6" }).apiKey).toBe("[REDACTED]");
		expect(redact({ token: "tok_secret_xyz" }).token).toBe("[REDACTED]");
		expect(redact({ key: "some-secret-value" }).key).toBe("[REDACTED]");
	});

	it("should redact password fields", () => {
		const result = redact({ password: "supersecret123" });
		expect(result.password).toBe("[REDACTED]");
	});

	it("should redact nested password fields", () => {
		const input = { user: { password: "secret", email: "test@test.com" } };
		const result = redact(input) as Record<string, unknown>;
		const user = result.user as Record<string, unknown>;
		expect(user.password).toBe("[REDACTED]");
		expect(user.email).toBe("test@test.com");
	});

	it("should redact secret fields", () => {
		const result = redact({ client_secret: "mysecret", secretKey: "secret" });
		expect(result.client_secret).toBe("[REDACTED]");
		expect(result.secretKey).toBe("[REDACTED]");
	});

	it("should redact Authorization header", () => {
		const result = redact({ headers: { authorization: "Bearer xxx" } });
		const headers = result.headers as Record<string, unknown>;
		expect(headers.authorization).toBe("[REDACTED]");
	});

	it("should redact signed URLs containing signature", () => {
		const url =
			"https://storage.example.com/file.pdf?Signature=abc123&Expires=123456";
		const result = redact({ url });
		expect(result.url).toContain("[REDACTED]");
		expect(result.url).not.toContain("abc123");
	});

	it("should redact email body HTML", () => {
		const input = { htmlBody: "<html><body>Hello</body></html>" };
		const result = redact(input);
		expect(result.htmlBody).toBe("[REDACTED]");
	});

	it("should redact password reset tokens", () => {
		const result = redact({ token: "pwd_reset_a1b2c3d4" });
		expect(result.token).toBe("[REDACTED]");
	});

	it("should preserve safe fields", () => {
		const input = {
			name: "John",
			email: "john@test.com",
			message: "Hello",
			status: "success",
		};
		const result = redact(input);
		expect(result).toEqual(input);
	});

	it("should handle arrays", () => {
		const input = [{ token: "secret1" }, { token: "secret2" }];
		const result = redact(input) as Array<Record<string, unknown>>;
		expect(result[0]?.token).toBe("[REDACTED]");
		expect(result[1]?.token).toBe("[REDACTED]");
	});

	it("should handle null and undefined", () => {
		expect(redact(null)).toBeNull();
		expect(redact(undefined)).toBeUndefined();
	});

	it("should handle plain strings", () => {
		expect(redact("hello")).toBe("hello");
	});

	it("should redact request body containing raw personal data", () => {
		const input = {
			body: {
				password: "mypassword",
				passwordConfirm: "mypassword",
				fullName: "John Doe",
			},
		};
		const result = redact(input) as Record<string, unknown>;
		const body = result.body as Record<string, unknown>;
		expect(body.password).toBe("[REDACTED]");
		expect(body.passwordConfirm).toBe("[REDACTED]");
		expect(body.fullName).toBe("John Doe");
	});
});
