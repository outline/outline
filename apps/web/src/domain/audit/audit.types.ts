import type { TId, TTenantId, TUserId } from "@/shared/types/common.types";

export type TAuditLogId = TId & { readonly _brand: "AuditLogId" };

export type TAuditLog = {
	readonly id: TAuditLogId;
	readonly tenantId: TTenantId;
	readonly userId: TUserId;
	readonly action: string;
	readonly entityType: string;
	readonly entityId: string | null;
	readonly oldValue: Record<string, unknown> | null;
	readonly newValue: Record<string, unknown> | null;
	readonly ipAddress: string | null;
	readonly userAgent: string | null;
	readonly createdAt: Date;
};
