import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TTenantId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";
import type { TBusiness, TProfile } from "./identity.types";

export class IIdentityRepository extends Context.Tag("IIdentityRepository")<
	IIdentityRepository,
	{
		readonly findProfileByUserId: (
			userId: TUserId,
		) => Effect.Effect<TProfile | null, DatabaseError>;
		readonly updateProfile: (
			userId: TUserId,
			updates: { fullName: string; phoneNumber?: string },
		) => Effect.Effect<void, DatabaseError>;
		readonly updateEmail: (
			userId: TUserId,
			email: string,
		) => Effect.Effect<void, DatabaseError>;
		readonly findBusinessById: (
			id: TTenantId,
		) => Effect.Effect<TBusiness | null, DatabaseError>;
		readonly updateBusiness: (
			id: TTenantId,
			updates: { name?: string; logo_url?: string; signature_url?: string },
		) => Effect.Effect<void, DatabaseError>;
		readonly checkRole: (
			userId: TUserId,
			businessId: TTenantId,
			role: TUserRole,
		) => Effect.Effect<boolean, DatabaseError>;
		readonly findBranchesForUser: (
			userId: TUserId,
		) => Effect.Effect<readonly { id: string; name: string }[], DatabaseError>;
		readonly hasPinSet: (
			userId: TUserId,
		) => Effect.Effect<boolean, DatabaseError>;
		readonly verifyCurrentPassword: (
			userId: TUserId,
			currentPassword: string,
		) => Effect.Effect<boolean, DatabaseError>;
		readonly changePassword: (
			userId: TUserId,
			password: string,
		) => Effect.Effect<void, DatabaseError>;
		readonly verifyPin: (
			userId: TUserId,
			pin: string,
		) => Effect.Effect<boolean, DatabaseError>;
		readonly setPin: (
			userId: TUserId,
			pin: string,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
