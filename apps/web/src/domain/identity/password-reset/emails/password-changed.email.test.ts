import { describe, expect, it } from "vitest";
import { buildPasswordChangedEmail } from "./password-changed.email";

describe("buildPasswordChangedEmail", () => {
	it("confirms the change without revealing the new password", () => {
		const result = buildPasswordChangedEmail();
		expect(result.subject).toContain("Password");
		expect(result.text.toLowerCase()).toContain("berhasil diubah");
		expect(result.html).not.toContain("undefined");
	});

	it("includes a security warning for unrecognized changes", () => {
		const result = buildPasswordChangedEmail();
		expect(result.text.toLowerCase()).toContain("bukan anda");
	});

	it("returns text, html, and subject fields", () => {
		const result = buildPasswordChangedEmail();
		expect(result).toHaveProperty("subject");
		expect(result).toHaveProperty("text");
		expect(result).toHaveProperty("html");
	});
});
