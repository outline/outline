import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TBranchId,
	TTenantId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";
import type { TStaffMember } from "./staff.types";

export class IStaffRepository extends Context.Tag("IStaffRepository")<
	IStaffRepository,
	{
		readonly findAll: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TStaffMember[], DatabaseError>;
		readonly findUserIdByEmail: (
			email: string,
		) => Effect.Effect<TUserId | null, DatabaseError>;
		readonly inviteStaff: (
			params: {
				readonly userId: TUserId;
				readonly branchId: TBranchId;
				readonly role: TUserRole;
			},
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
		readonly removeFromBranch: (
			userId: TUserId,
			branchId: TBranchId,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
		readonly setActive?: (
			userId: TUserId,
			tenantId: TTenantId,
			isActive: boolean,
		) => Effect.Effect<boolean, DatabaseError>;
	}
>() {}
