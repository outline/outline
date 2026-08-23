import { describe, expect, it } from "vitest";
import { noopFrontendObservabilityAdapter } from "./noop-frontend-observability.adapter";

describe("noopFrontendObservabilityAdapter", () => {
	it("captures without throwing and without side effects", () => {
		expect(() =>
			noopFrontendObservabilityAdapter.capture({
				event: "test.event",
				level: "info",
				attributes: { foo: "bar" },
			}),
		).not.toThrow();
	});

	it("flush resolves to undefined", async () => {
		await expect(
			noopFrontendObservabilityAdapter.flush(),
		).resolves.toBeUndefined();
	});

	it("accepts all level values", () => {
		const levels = ["debug", "info", "warn", "error"] as const;
		for (const level of levels) {
			expect(() =>
				noopFrontendObservabilityAdapter.capture({ event: "x", level }),
			).not.toThrow();
		}
	});

	it("accepts events without optional fields", () => {
		expect(() =>
			noopFrontendObservabilityAdapter.capture({
				event: "minimal",
				level: "info",
			}),
		).not.toThrow();
	});
});
