import { describe, expect, it } from "vitest";
import {
	buildActionPermissions,
	roleHasCapability,
} from "./action-permissions";

describe("buildActionPermissions", () => {
	it("returns false for every capability when role is missing", () => {
		const perms = buildActionPermissions(null);
		expect(perms.can("product:write")).toBe(false);
		expect(perms.canAny(["product:write", "billing:write"])).toBe(false);
		expect(perms.canAll(["product:write", "billing:write"])).toBe(false);
	});

	it("mirrors the role matrix for owner", () => {
		const perms = buildActionPermissions("owner");
		expect(perms.can("product:write")).toBe(true);
		expect(perms.can("product:delete")).toBe(true);
		expect(perms.can("staff:invite")).toBe(true);
		expect(perms.can("billing:write")).toBe(true);
	});

	it("restricts kasir to POS-ish capabilities", () => {
		const perms = buildActionPermissions("kasir");
		expect(perms.can("order:write")).toBe(true);
		expect(perms.can("product:read")).toBe(true);
		expect(perms.can("staff:invite")).toBe(false);
		expect(perms.can("billing:write")).toBe(true);
	});

	it("canAny is OR, canAll is AND over the role's capability set", () => {
		const perms = buildActionPermissions("manager");
		expect(perms.canAny(["staff:invite", "billing:write"])).toBe(true);
		expect(perms.canAll(["staff:invite", "billing:write"])).toBe(false);
		expect(perms.canAll(["product:write", "product:read"])).toBe(true);
	});

	it("roleHasCapability is false for unknown role", () => {
		expect(
			roleHasCapability(
				undefined as unknown as Parameters<typeof roleHasCapability>[0],
				"product:write",
			),
		).toBe(false);
	});
});
