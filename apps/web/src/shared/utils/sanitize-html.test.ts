import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize-html";

describe("sanitizeHtml", () => {
	it("strips a non-allowlisted <img> with an onerror handler", () => {
		const out = sanitizeHtml('<img src="x" onerror="alert(1)">');
		expect(out).not.toContain("<img");
		expect(out).not.toContain("onerror");
	});

	it("strips <script> tags and their body", () => {
		const out = sanitizeHtml("<script>alert(1)</script>hello");
		expect(out).not.toContain("script");
		expect(out).not.toContain("alert(1)");
		expect(out).toContain("hello");
	});

	it("keeps allowlisted formatting tags", () => {
		const out = sanitizeHtml("<p>Jl. Mawar <strong>No. 5</strong></p>");
		expect(out).toContain("<p>");
		expect(out).toContain("<strong>");
		expect(out).toContain("No. 5");
	});

	it("removes a javascript: href but keeps the anchor text", () => {
		const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
		expect(out).not.toContain("javascript:");
		expect(out).toContain("click");
	});

	it("keeps an http(s) href", () => {
		const out = sanitizeHtml('<a href="https://example.com">site</a>');
		expect(out).toContain('href="https://example.com"');
	});

	it("strips a non-allowlisted <div> with an onclick, keeping inner text", () => {
		const out = sanitizeHtml('<div onclick="steal()">hi</div>');
		expect(out).not.toContain("onclick");
		expect(out).not.toContain("<div");
		expect(out).toContain("hi");
	});

	it("returns empty string for null/undefined/non-string", () => {
		expect(sanitizeHtml(null)).toBe("");
		expect(sanitizeHtml(undefined)).toBe("");
		// biome-ignore lint/suspicious/noExplicitAny: exercising non-string input
		expect(sanitizeHtml(123 as any)).toBe("");
	});
});
