import { describe, expect, it } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { ROLE_CAPABILITIES, type TCapability } from "./capability-matrix";
import { hasCapability } from "./security-context";

describe("capability matrix", () => {
	it("owner should have ALL capabilities", () => {
		const allCaps = new Set<TCapability>();
		for (const caps of Object.values(ROLE_CAPABILITIES)) {
			for (const c of caps) allCaps.add(c);
		}
		for (const cap of allCaps) {
			expect(hasCapability("owner", cap)).toBe(true);
		}
	});

	it("owner should have admin:seed", () => {
		expect(hasCapability("owner", "admin:seed")).toBe(true);
	});

	it("manager should NOT have billing:write or admin:seed", () => {
		expect(hasCapability("manager", "billing:write")).toBe(false);
		expect(hasCapability("manager", "admin:seed")).toBe(false);
	});

	it("manager should have operational write capabilities", () => {
		expect(hasCapability("manager", "branch:write")).toBe(true);
		expect(hasCapability("manager", "customer:write")).toBe(true);
		expect(hasCapability("manager", "inventory:write")).toBe(true);
		expect(hasCapability("manager", "staff:invite")).toBe(true);
		expect(hasCapability("manager", "staff:remove")).toBe(true);
		expect(hasCapability("manager", "boarding:write")).toBe(true);
		expect(hasCapability("manager", "product:write")).toBe(true);
		expect(hasCapability("manager", "product:delete")).toBe(true);
		expect(hasCapability("manager", "accounting:write")).toBe(true);
		expect(hasCapability("manager", "invoice:write")).toBe(true);
		expect(hasCapability("manager", "whatsapp:write")).toBe(true);
	});

	it("kasir should have order/customer/product read-write and boarding", () => {
		expect(hasCapability("kasir", "order:write")).toBe(true);
		expect(hasCapability("kasir", "order:void")).toBe(true);
		expect(hasCapability("kasir", "customer:write")).toBe(true);
		expect(hasCapability("kasir", "product:write")).toBe(true);
		expect(hasCapability("kasir", "product:read")).toBe(true);
		expect(hasCapability("kasir", "boarding:write")).toBe(true);
		expect(hasCapability("kasir", "billing:write")).toBe(true);
		expect(hasCapability("kasir", "invoice:write")).toBe(true);
	});

	it("kasir should NOT have admin/staff/manager capabilities", () => {
		expect(hasCapability("kasir", "staff:invite")).toBe(false);
		expect(hasCapability("kasir", "staff:remove")).toBe(false);
		expect(hasCapability("kasir", "admin:seed")).toBe(false);
		expect(hasCapability("kasir", "accounting:write")).toBe(false);
		expect(hasCapability("kasir", "whatsapp:write")).toBe(false);
	});

	it("staff_daycare should only have boarding, pet, customer, profile", () => {
		expect(hasCapability("staff_daycare", "boarding:write")).toBe(true);
		expect(hasCapability("staff_daycare", "boarding:read")).toBe(true);
		expect(hasCapability("staff_daycare", "pet:write")).toBe(true);
		expect(hasCapability("staff_daycare", "customer:read")).toBe(true);
		expect(hasCapability("staff_daycare", "product:write")).toBe(false);
		expect(hasCapability("staff_daycare", "staff:invite")).toBe(false);
		expect(hasCapability("staff_daycare", "admin:seed")).toBe(false);
	});

	it("all roles have profile:write", () => {
		for (const role of [
			"owner",
			"manager",
			"kasir",
			"staff_daycare",
		] as const) {
			expect(hasCapability(role, "profile:write")).toBe(true);
		}
	});
});

describe("requireCapability", () => {
	it("should fail for missing capability on any role", async () => {
		const { requireCapability, UnauthorizedError } = await import(
			"./security-context"
		);
		const { Effect } = await import("effect");

		const result = Effect.runSync(
			Effect.flip(
				requireCapability(
					{
						userId: "u1" as TUserId,
						tenantId: "b1" as TTenantId,
						role: "staff_daycare",
						requestId: "r1",
					},
					"admin:seed",
				),
			),
		);
		expect(result).toBeInstanceOf(UnauthorizedError);
		expect((result as { _tag: string })._tag).toBe("UnauthorizedError");
	});
});
