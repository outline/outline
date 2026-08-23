import type { TAuditLog } from "./audit.types";

export type TAuditLogDto = {
	readonly id: string;
	readonly userId: string;
	readonly action: string;
	readonly entityType: string;
	readonly entityId: string | null;
	readonly createdAt: string;
};

export const toAuditLogDto = (log: TAuditLog): TAuditLogDto => ({
	id: log.id,
	userId: log.userId,
	action: log.action,
	entityType: log.entityType,
	entityId: log.entityId,
	createdAt: log.createdAt.toISOString(),
});
