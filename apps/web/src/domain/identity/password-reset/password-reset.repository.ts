import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TUserId } from "@/shared/types/common.types";
import type { InvalidResetTokenError } from "./password-reset.errors";

export type TPasswordResetToken = {
	readonly id: string;
	readonly userId: TUserId;
	readonly tokenHash: string;
	readonly expiresAt: string;
	readonly usedAt: string | null;
};

export type TCreateResetTokenInput = {
	readonly userId: TUserId;
	readonly tokenHash: string;
	readonly expiresAt: string;
};

export class IPasswordResetRepository extends Context.Tag(
	"IPasswordResetRepository",
)<
	IPasswordResetRepository,
	{
		readonly create: (
			input: TCreateResetTokenInput,
		) => Effect.Effect<void, DatabaseError>;
		readonly findByTokenHash: (
			tokenHash: string,
		) => Effect.Effect<TPasswordResetToken | null, DatabaseError>;
		readonly markAsUsed: (id: string) => Effect.Effect<void, DatabaseError>;
		readonly invalidateActiveTokensForUser: (
			userId: TUserId,
		) => Effect.Effect<void, DatabaseError>;
		readonly consumeAndChangePassword: (input: {
			readonly tokenHash: string;
			readonly newPassword: string;
			readonly now: string;
		}) => Effect.Effect<
			{ readonly userId: TUserId; readonly email: string },
			DatabaseError | InvalidResetTokenError
		>;
	}
>() {}
