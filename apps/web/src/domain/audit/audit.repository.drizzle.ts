import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { auditLogs } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { IAuditRepository } from "./audit.repository";
import type { AuditLogFilter } from "./audit.schemas";
import type { TAuditLog, TAuditLogId } from "./audit.types";

type TAuditLogRow = typeof auditLogs.$inferSelect;

const mapAuditLog = (row: TAuditLogRow): TAuditLog => {
	const createdAt =
		typeof row.createdAt === "string"
			? new Date(row.createdAt)
			: new Date(row.createdAt ?? Date.now());
	return {
		id: row.id as TAuditLogId,
		tenantId: row.businessId as TTenantId,
		userId: row.userId as TUserId,
		action: row.action,
		entityType: row.entityType,
		entityId: row.entityId,
		oldValue: (row.oldValue ?? null) as Record<string, unknown> | null,
		newValue: (row.newValue ?? null) as Record<string, unknown> | null,
		ipAddress: row.ipAddress,
		userAgent: row.userAgent,
		createdAt,
	};
};

export const AuditRepositoryDrizzle = Layer.effect(
	IAuditRepository,
	Effect.map(IDrizzleClient, (db) =>
		IAuditRepository.of({
			findAll: (tenantId: TTenantId, filter: AuditLogFilter) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const conditions = [eq(auditLogs.businessId, tenantId)];
							if (filter.entityType) {
								conditions.push(eq(auditLogs.entityType, filter.entityType));
							}
							if (filter.entityId) {
								conditions.push(eq(auditLogs.entityId, filter.entityId));
							}
							if (filter.action) {
								conditions.push(eq(auditLogs.action, filter.action));
							}
							if (filter.userId) {
								conditions.push(eq(auditLogs.userId, filter.userId));
							}
							if (filter.startDate) {
								conditions.push(
									gte(auditLogs.createdAt, filter.startDate.toISOString()),
								);
							}
							if (filter.endDate) {
								conditions.push(
									lte(auditLogs.createdAt, filter.endDate.toISOString()),
								);
							}

							const page = filter.page || 1;
							const pageSize = filter.pageSize || 20;
							const offset = (page - 1) * pageSize;

							const rows = await db
								.select()
								.from(auditLogs)
								.where(and(...conditions))
								.orderBy(desc(auditLogs.createdAt))
								.limit(pageSize)
								.offset(offset);

							const totalRow = await db
								.select({ value: count() })
								.from(auditLogs)
								.where(and(...conditions));

							return {
								logs: rows.map(mapAuditLog),
								total: Number(totalRow[0]?.value ?? 0),
							};
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			save: (log: TAuditLog) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(auditLogs).values({
								id: log.id,
								businessId: log.tenantId,
								userId: log.userId,
								action: log.action,
								entityType: log.entityType,
								entityId: log.entityId,
								oldValue: log.oldValue ?? null,
								newValue: log.newValue ?? null,
								ipAddress: log.ipAddress,
								userAgent: log.userAgent,
								createdAt: log.createdAt.toISOString(),
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getStats: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select({ value: count() })
								.from(auditLogs)
								.where(eq(auditLogs.businessId, tenantId));
							return { total: Number(rows[0]?.value ?? 0) };
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
