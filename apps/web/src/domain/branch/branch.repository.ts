import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TBranch,
	TBranchHoliday,
	TBranchHolidayId,
	TBranchId,
} from "./branch.types";

export class IBranchRepository extends Context.Tag("IBranchRepository")<
	IBranchRepository,
	{
		readonly findById: (
			id: TBranchId,
			tenantId: TTenantId,
		) => Effect.Effect<TBranch | null, DatabaseError>;
		readonly findAll: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TBranch[], DatabaseError>;
		readonly createBranch: (
			branch: TBranch,
			userId: string,
		) => Effect.Effect<void, DatabaseError>;
		readonly update: (branch: TBranch) => Effect.Effect<void, DatabaseError>;
		readonly findHolidays: (
			branchId: TBranchId,
			tenantId: TTenantId,
		) => Effect.Effect<readonly TBranchHoliday[], DatabaseError>;
		readonly saveHoliday: (
			holiday: TBranchHoliday,
		) => Effect.Effect<void, DatabaseError>;
		readonly deleteHoliday: (
			id: TBranchHolidayId,
			branchId: TBranchId,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
