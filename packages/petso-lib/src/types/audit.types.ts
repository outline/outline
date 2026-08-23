export interface TAuditLogDto {
	readonly id: string;
	readonly userId: string;
	readonly action: string;
	readonly entityType: string;
	readonly entityId: string | null;
	readonly createdAt: string;
}
