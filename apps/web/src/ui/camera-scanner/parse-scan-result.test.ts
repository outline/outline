import { describe, expect, it } from "vitest";
import { parseScanResult } from "./parse-scan-result";

describe("parseScanResult", () => {
	it("extracts productId from a product URL", () => {
		expect(parseScanResult("https://app.example.com/products/abc-123")).toEqual(
			{
				productId: "abc-123",
			},
		);
	});

	it("strips query strings from product URLs", () => {
		expect(
			parseScanResult("https://app.example.com/products/abc-123?ref=qr"),
		).toEqual({ productId: "abc-123" });
	});

	it("returns raw text as barcode when not a product URL", () => {
		expect(parseScanResult("8991234567890")).toEqual({
			barcode: "8991234567890",
		});
	});

	it("trims whitespace from barcodes", () => {
		expect(parseScanResult("  8991234567890 ")).toEqual({
			barcode: "8991234567890",
		});
	});

	it("falls back to barcode when the product URL has no id", () => {
		expect(parseScanResult("https://app.example.com/products/")).toEqual({
			barcode: "https://app.example.com/products/",
		});
	});
});
