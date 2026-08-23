import { describe, expect, it } from "vitest";
import {
	ALLOWED_BUCKETS,
	ALLOWED_MIME_TYPES,
	MAX_FILE_SIZE_BYTES,
} from "@/shared/ports/storage.port";

describe("storage server function validation", () => {
	it("should have allowed buckets", () => {
		expect(ALLOWED_BUCKETS).toContain("boarding-photos");
		expect(ALLOWED_BUCKETS).toContain("public-assets");
	});

	it("should include the new logical buckets added for ember-backed uploads", () => {
		expect(ALLOWED_BUCKETS).toContain("pet-photos");
		expect(ALLOWED_BUCKETS).toContain("grooming-photos");
		expect(ALLOWED_BUCKETS).toContain("product-images");
		expect(ALLOWED_BUCKETS).toContain("receipts");
		expect(ALLOWED_BUCKETS).toContain("portal-assets");
	});

	it("maximum file size should be 4 MB", () => {
		expect(MAX_FILE_SIZE_BYTES).toBe(4_194_304);
	});

	it("should only accept safe MIME types", () => {
		const allowed = new Set(ALLOWED_MIME_TYPES);
		expect(allowed.has("image/jpeg")).toBe(true);
		expect(allowed.has("image/png")).toBe(true);
		expect(allowed.has("image/webp")).toBe(true);
		expect(allowed.has("application/pdf")).toBe(true);
	});
});
