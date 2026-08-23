import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TCapability } from "@/infra/auth/capability-matrix";
import { hasCapability } from "@/infra/auth/security-context";
import type {
	TTenantId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";

const makeContext = (role: TUserRole) => ({
	userId: "user-1" as TUserId,
	tenantId: "biz-1" as TTenantId,
	role,
	requestId: "req-1",
});

const MUTATIONS_BY_CAPABILITY: Record<
	string,
	{ readonly capability: string; readonly allowedRoles: readonly TUserRole[] }
> = {
	"Branch write": {
		capability: "branch:write",
		allowedRoles: ["owner", "manager"],
	},
	"Order write": {
		capability: "order:write",
		allowedRoles: ["owner", "manager", "kasir"],
	},
	"Order void": {
		capability: "order:void",
		allowedRoles: ["owner", "manager", "kasir"],
	},
	"Billing write": {
		capability: "billing:write",
		allowedRoles: ["owner", "kasir"],
	},
	"Customer write": {
		capability: "customer:write",
		allowedRoles: ["owner", "manager", "kasir"],
	},
	"Inventory write": {
		capability: "inventory:write",
		allowedRoles: ["owner", "manager"],
	},
	"Staff invite": {
		capability: "staff:invite",
		allowedRoles: ["owner", "manager"],
	},
	"Staff remove": {
		capability: "staff:remove",
		allowedRoles: ["owner", "manager"],
	},
	"Boarding write": {
		capability: "boarding:write",
		allowedRoles: ["owner", "manager", "kasir", "staff_daycare"],
	},
	"Product write": {
		capability: "product:write",
		allowedRoles: ["owner", "manager", "kasir"],
	},
	"Product delete": {
		capability: "product:delete",
		allowedRoles: ["owner", "manager"],
	},
	"Accounting write": {
		capability: "accounting:write",
		allowedRoles: ["owner", "manager"],
	},
	"Commission write": {
		capability: "commission:write",
		allowedRoles: ["owner", "manager"],
	},
	"Grooming write": {
		capability: "grooming:write",
		allowedRoles: ["owner", "manager"],
	},
	"Invoice write": {
		capability: "invoice:write",
		allowedRoles: ["owner", "manager", "kasir"],
	},
	"Loyalty write": {
		capability: "loyalty:write",
		allowedRoles: ["owner", "manager"],
	},
	"Pet write": {
		capability: "pet:write",
		allowedRoles: ["owner", "manager", "kasir", "staff_daycare"],
	},
	"PO write": {
		capability: "po:write",
		allowedRoles: ["owner", "manager"],
	},
	"Portal write": {
		capability: "portal:write",
		allowedRoles: ["owner", "manager"],
	},
	"Return write": {
		capability: "return:write",
		allowedRoles: ["owner", "manager"],
	},
	"Room write": {
		capability: "room:write",
		allowedRoles: ["owner", "manager"],
	},
	"Shift write": {
		capability: "shift:write",
		allowedRoles: ["owner", "manager"],
	},
	"Supplier write": {
		capability: "supplier:write",
		allowedRoles: ["owner", "manager"],
	},
	"Profile write": {
		capability: "profile:write",
		allowedRoles: ["owner", "manager", "kasir", "staff_daycare"],
	},
	"WhatsApp write": {
		capability: "whatsapp:write",
		allowedRoles: ["owner", "manager"],
	},
	"Storage write": {
		capability: "storage:write",
		allowedRoles: ["owner", "manager"],
	},
	"Admin seed": {
		capability: "admin:seed",
		allowedRoles: ["owner"],
	},
};

describe("mutation authorization", () => {
	for (const [group, { capability, allowedRoles }] of Object.entries(
		MUTATIONS_BY_CAPABILITY,
	)) {
		describe(group, () => {
			const allRoles: TUserRole[] = [
				"owner",
				"manager",
				"kasir",
				"staff_daycare",
			];

			for (const role of allRoles) {
				const shouldAllow = allowedRoles.includes(role);
				it(`${shouldAllow ? "ALLOW" : "DENY"} for role ${role}`, () => {
					const result = hasCapability(role, capability as TCapability);
					expect(result).toBe(shouldAllow);
				});
			}
		});
	}
});

describe("security context has tenantId", () => {
	it("every server function context must have tenantId", () => {
		const ctx = makeContext("owner");
		expect(ctx.tenantId).toBeDefined();
		expect(ctx.role).toBeDefined();
		expect(ctx.requestId).toBeDefined();
	});

	it("staff_daycare cannot access admin:seed", async () => {
		const { requireCapability } = await import("@/infra/auth/security-context");
		const result = Effect.runSync(
			Effect.flip(
				requireCapability(makeContext("staff_daycare"), "admin:seed"),
			),
		);
		expect(result._tag).toBe("UnauthorizedError");
	});
});
