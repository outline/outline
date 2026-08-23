export type TCapability =
	| "branch:read"
	| "branch:write"
	| "order:read"
	| "order:write"
	| "order:void"
	| "billing:read"
	| "billing:write"
	| "customer:read"
	| "customer:write"
	| "inventory:read"
	| "inventory:write"
	| "staff:read"
	| "staff:invite"
	| "staff:remove"
	| "boarding:read"
	| "boarding:write"
	| "product:read"
	| "product:write"
	| "product:delete"
	| "accounting:write"
	| "commission:write"
	| "document:write"
	| "grooming:write"
	| "invoice:write"
	| "loyalty:write"
	| "pet:write"
	| "po:write"
	| "portal:write"
	| "return:write"
	| "room:write"
	| "shift:write"
	| "supplier:write"
	| "profile:write"
	| "whatsapp:write"
	| "storage:write"
	| "settings:manage"
	| "admin:seed";

import type { TUserRole } from "@/shared/types/common.types";

export const ROLE_CAPABILITIES: Record<TUserRole, readonly TCapability[]> = {
	owner: [
		"branch:read",
		"branch:write",
		"order:read",
		"order:write",
		"order:void",
		"billing:read",
		"billing:write",
		"customer:read",
		"customer:write",
		"inventory:read",
		"inventory:write",
		"staff:read",
		"staff:invite",
		"staff:remove",
		"boarding:read",
		"boarding:write",
		"product:read",
		"product:write",
		"product:delete",
		"accounting:write",
		"commission:write",
		"document:write",
		"grooming:write",
		"invoice:write",
		"loyalty:write",
		"pet:write",
		"po:write",
		"portal:write",
		"return:write",
		"room:write",
		"shift:write",
		"supplier:write",
		"profile:write",
		"whatsapp:write",
		"storage:write",
		"settings:manage",
		"admin:seed",
	],
	manager: [
		"branch:write",
		"order:read",
		"order:write",
		"order:void",
		"customer:read",
		"customer:write",
		"inventory:read",
		"inventory:write",
		"staff:read",
		"staff:invite",
		"staff:remove",
		"boarding:read",
		"boarding:write",
		"product:read",
		"product:write",
		"product:delete",
		"accounting:write",
		"commission:write",
		"document:write",
		"grooming:write",
		"invoice:write",
		"loyalty:write",
		"pet:write",
		"po:write",
		"portal:write",
		"return:write",
		"room:write",
		"shift:write",
		"supplier:write",
		"profile:write",
		"whatsapp:write",
		"storage:write",
	],
	kasir: [
		"order:read",
		"order:write",
		"order:void",
		"customer:read",
		"customer:write",
		"product:read",
		"product:write",
		"boarding:read",
		"boarding:write",
		"billing:write",
		"invoice:write",
		"pet:write",
		"profile:write",
	],
	staff_daycare: [
		"boarding:read",
		"boarding:write",
		"pet:write",
		"customer:read",
		"profile:write",
	],
};
