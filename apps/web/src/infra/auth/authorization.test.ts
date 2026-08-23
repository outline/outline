import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type {
	TTenantId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";
import { hasCapability, requireCapability } from "./security-context";

describe("hasCapability", () => {
	it("owner should have all capabilities", () => {
		expect(hasCapability("owner", "product:write")).toBe(true);
		expect(hasCapability("owner", "product:delete")).toBe(true);
		expect(hasCapability("owner", "staff:invite")).toBe(true);
		expect(hasCapability("owner", "boarding:write")).toBe(true);
		expect(hasCapability("owner", "billing:write")).toBe(true);
		expect(hasCapability("owner", "storage:write")).toBe(true);
		expect(hasCapability("owner", "admin:seed")).toBe(true);
	});

	it("manager should have product:write, boarding:write, staff:invite, storage:write", () => {
		expect(hasCapability("manager", "product:write")).toBe(true);
		expect(hasCapability("manager", "product:delete")).toBe(true);
		expect(hasCapability("manager", "boarding:write")).toBe(true);
		expect(hasCapability("manager", "staff:invite")).toBe(true);
		expect(hasCapability("manager", "storage:write")).toBe(true);
	});

	it("manager should NOT have billing:write, admin:seed", () => {
		expect(hasCapability("manager", "billing:write")).toBe(false);
		expect(hasCapability("manager", "admin:seed")).toBe(false);
	});

	it("kasir should have product:write, boarding:write, billing:write", () => {
		expect(hasCapability("kasir", "product:write")).toBe(true);
		expect(hasCapability("kasir", "boarding:write")).toBe(true);
		expect(hasCapability("kasir", "billing:write")).toBe(true);
	});

	it("kasir should NOT have staff:invite, admin:seed, storage:write", () => {
		expect(hasCapability("kasir", "staff:invite")).toBe(false);
		expect(hasCapability("kasir", "admin:seed")).toBe(false);
		expect(hasCapability("kasir", "storage:write")).toBe(false);
	});

	it("staff_daycare should only have boarding:write", () => {
		expect(hasCapability("staff_daycare", "boarding:write")).toBe(true);
		expect(hasCapability("staff_daycare", "product:write")).toBe(false);
		expect(hasCapability("staff_daycare", "staff:invite")).toBe(false);
		expect(hasCapability("staff_daycare", "product:delete")).toBe(false);
	});
});

describe("requireCapability", () => {
	const makeContext = (role: TUserRole) => ({
		userId: "user-1" as TUserId,
		tenantId: "biz-1" as TTenantId,
		role,
		requestId: "req-1",
	});

	it("should succeed when role has the capability", () => {
		const result = Effect.runSync(
			requireCapability(makeContext("owner"), "admin:seed"),
		);
		expect(result).toBeUndefined();
	});

	it("should fail with UnauthorizedError when role lacks the capability", () => {
		expect(() =>
			Effect.runSync(requireCapability(makeContext("kasir"), "admin:seed")),
		).toThrow("Unauthorized");
	});
});
