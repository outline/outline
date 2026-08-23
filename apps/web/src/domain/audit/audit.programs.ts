import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { type TAuditLogDto, toAuditLogDto } from "./audit.dto";
import { AuditModule } from "./audit.module";
import { IAuditRepository } from "./audit.repository";
import type { AuditLogFilter } from "./audit.schemas";

export const getAuditLogsProgram = (
	tenantId: TTenantId,
	filter: AuditLogFilter,
): Effect.Effect<
	{ logs: readonly TAuditLogDto[]; total: number },
	DatabaseError,
	IAuditRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IAuditRepository;
		const { logs, total } = yield* repo.findAll(tenantId, filter);
		return {
			logs: logs.map(toAuditLogDto),
			total,
		};
	});

export const logAuditEventProgram = (
	tenantId: TTenantId,
	userId: TUserId,
	action: string,
	entityType: string,
	entityId: string | null,
	oldValue: Record<string, unknown> | null,
	newValue: Record<string, unknown> | null,
	ipAddress: string | null,
	userAgent: string | null,
): Effect.Effect<void, DatabaseError, IAuditRepository> =>
	Effect.gen(function* () {
		const repo = yield* IAuditRepository;
		const log = AuditModule.create({
			tenantId,
			userId,
			action,
			entityType,
			entityId,
			oldValue,
			newValue,
			ipAddress,
			userAgent,
		});
		yield* repo.save(log);
	});
