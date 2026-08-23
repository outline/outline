import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { AuditLogFilter } from "./audit.schemas";
import type { TAuditLog } from "./audit.types";

export class IAuditRepository extends Context.Tag("IAuditRepository")<
	IAuditRepository,
	{
		readonly findAll: (
			tenantId: TTenantId,
			filter: AuditLogFilter,
		) => Effect.Effect<
			{ logs: readonly TAuditLog[]; total: number },
			DatabaseError
		>;
		readonly save: (log: TAuditLog) => Effect.Effect<void, DatabaseError>;
		readonly getStats: (
			tenantId: TTenantId,
		) => Effect.Effect<{ total: number }, DatabaseError>;
	}
>() {}
