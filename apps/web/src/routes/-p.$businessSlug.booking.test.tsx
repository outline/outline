import { describe, expect, it } from "vitest";
import {
	resolvePreselectedServiceId,
	shouldApplyPreselectedService,
} from "./p.$businessSlug.booking";

describe("resolvePreselectedServiceId", () => {
	const services = [{ id: "svc-1" }, { id: "svc-2" }];

	it("returns the id when it matches a loaded service", () => {
		expect(resolvePreselectedServiceId("svc-1", services)).toBe("svc-1");
	});

	it("returns undefined when the id has no match", () => {
		expect(resolvePreselectedServiceId("svc-999", services)).toBeUndefined();
	});

	it("returns undefined when no id is requested", () => {
		expect(resolvePreselectedServiceId(undefined, services)).toBeUndefined();
	});

	it("returns undefined when services haven't loaded yet", () => {
		expect(resolvePreselectedServiceId("svc-1", undefined)).toBeUndefined();
	});
});

describe("shouldApplyPreselectedService", () => {
	it("returns true when a resolved id exists and no service is selected yet", () => {
		expect(shouldApplyPreselectedService("svc-1", "")).toBe(true);
	});

	it("returns false when the user already manually selected a service", () => {
		expect(shouldApplyPreselectedService("svc-1", "svc-2")).toBe(false);
	});

	it("returns false when there is no resolved id, regardless of current selection", () => {
		expect(shouldApplyPreselectedService(undefined, "")).toBe(false);
	});
});
