import { describe, expect, it } from "vitest";
import { buildReadyForPickupEmail } from "./ready-for-pickup.email";

describe("buildReadyForPickupEmail", () => {
	it("mentions a single pet by name in the subject and body", () => {
		const result = buildReadyForPickupEmail(["Milo"], "Ridho");
		expect(result.subject).toContain("Milo");
		expect(result.text).toContain("Milo");
		expect(result.text).toContain("Ridho");
		expect(result.html).toContain("Milo");
	});

	it("mentions multiple pets by name, joined naturally", () => {
		const result = buildReadyForPickupEmail(["Milo", "Luna"], "Ridho");
		expect(result.subject).toContain("Milo");
		expect(result.subject).toContain("Luna");
		expect(result.text).toContain("Milo dan Luna");
	});

	it("falls back to generic wording when no pet names are available", () => {
		const result = buildReadyForPickupEmail([], "Ridho");
		expect(result.subject).not.toContain("undefined");
		expect(result.text).not.toContain("undefined");
		expect(result.text.length).toBeGreaterThan(0);
	});
});
