import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import type { EmailAlreadyExistsError } from "./auth-repository.errors";

export type TAuthUser = {
	readonly id: TUserId;
	readonly email: string;
	readonly passwordHash: string;
};

export type TCreateUserWithBusinessInput = {
	readonly email: string;
	readonly passwordHash: string;
	readonly fullName: string;
	readonly businessName: string;
};

export type TCreateUserWithBusinessResult = {
	readonly userId: TUserId;
	readonly businessId: TTenantId;
};

export type TAuthSession = {
	readonly userId: TUserId;
	readonly expiresAt: Date;
};

export class IAuthRepository extends Context.Tag("IAuthRepository")<
	IAuthRepository,
	{
		readonly findUserByEmail: (
			email: string,
		) => Effect.Effect<TAuthUser | null, DatabaseError>;

		/**
		 * Atomic signup: creates the user, business, profile, owner role,
		 * default branch, branch membership, and free subscription in one
		 * Drizzle transaction — the Neon equivalent of the old
		 * `bootstrap_user` plpgsql RPC.
		 */
		readonly createUserWithBusiness: (
			input: TCreateUserWithBusinessInput,
		) => Effect.Effect<
			TCreateUserWithBusinessResult,
			DatabaseError | EmailAlreadyExistsError
		>;

		readonly createSession: (
			userId: TUserId,
		) => Effect.Effect<{ token: string; expiresAt: Date }, DatabaseError>;

		readonly findValidSessionByTokenHash: (
			tokenHash: string,
		) => Effect.Effect<TAuthSession | null, DatabaseError>;

		/** Sliding expiration — extends expiresAt by another 30 days. */
		readonly touchSession: (
			tokenHash: string,
		) => Effect.Effect<void, DatabaseError>;

		readonly deleteSessionByTokenHash: (
			tokenHash: string,
		) => Effect.Effect<void, DatabaseError>;

		readonly deleteSessionsByUserId: (
			userId: TUserId,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
