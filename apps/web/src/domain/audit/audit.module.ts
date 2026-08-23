import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type { TAuditLog, TAuditLogId } from "./audit.types";

export const AuditModule = {
	create: (params: {
		tenantId: TTenantId;
		userId: TUserId;
		action: string;
		entityType: string;
		entityId: string | null;
		oldValue: Record<string, unknown> | null;
		newValue: Record<string, unknown> | null;
		ipAddress: string | null;
		userAgent: string | null;
	}): TAuditLog => ({
		id: generateId() as TAuditLogId,
		tenantId: params.tenantId,
		userId: params.userId,
		action: params.action,
		entityType: params.entityType,
		entityId: params.entityId,
		oldValue: params.oldValue,
		newValue: params.newValue,
		ipAddress: params.ipAddress,
		userAgent: params.userAgent,
		createdAt: new Date(),
	}),

	reconstitute: (raw: TAuditLog): TAuditLog => ({ ...raw }),
} as const;
