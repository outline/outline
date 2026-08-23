import { and, eq, isNull, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { hashPassword } from "@/infra/auth/password";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	passwordResetTokens,
	sessions,
	users,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TUserId } from "@/shared/types/common.types";
import { InvalidResetTokenError } from "./password-reset.errors";
import {
	IPasswordResetRepository,
	type TCreateResetTokenInput,
	type TPasswordResetToken,
} from "./password-reset.repository";

export const PasswordResetRepositoryDrizzle = Layer.effect(
	IPasswordResetRepository,
	Effect.gen(function* () {
		const db = yield* IDrizzleClient;
		return {
			create: (input: TCreateResetTokenInput) =>
				Effect.tryPromise({
					try: async () => {
						await db.insert(passwordResetTokens).values({
							userId: input.userId,
							tokenHash: input.tokenHash,
							expiresAt: input.expiresAt,
						});
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),
			findByTokenHash: (tokenHash: string) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.passwordResetTokens.findFirst({
							where: {
								RAW: () => eq(passwordResetTokens.tokenHash, tokenHash),
							},
						});
						if (!row) return null;
						return {
							id: row.id,
							userId: row.userId as TUserId,
							tokenHash: row.tokenHash,
							expiresAt: row.expiresAt,
							usedAt: row.usedAt,
						} satisfies TPasswordResetToken;
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),
			markAsUsed: (id: string) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.update(passwordResetTokens)
							.set({ usedAt: sql`now()` })
							.where(eq(passwordResetTokens.id, id));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),
			invalidateActiveTokensForUser: (userId: TUserId) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.update(passwordResetTokens)
							.set({ usedAt: sql`now()` })
							.where(
								and(
									eq(passwordResetTokens.userId, userId),
									isNull(passwordResetTokens.usedAt),
								),
							);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),
			consumeAndChangePassword: ({ tokenHash, newPassword, now }) =>
				Effect.tryPromise({
					try: async () => {
						const passwordHash = await hashPassword(newPassword);
						return await db.transaction(async (tx) => {
							const [record] = await tx
								.select()
								.from(passwordResetTokens)
								.where(eq(passwordResetTokens.tokenHash, tokenHash))
								.limit(1)
								.for("update");

							if (!record) {
								throw new InvalidResetTokenError({
									message: "Token not found",
								});
							}

							if (record.usedAt !== null) {
								throw new InvalidResetTokenError({
									message: "Token has already been used",
								});
							}

							if (new Date(now) > new Date(record.expiresAt)) {
								throw new InvalidResetTokenError({
									message: "Token has expired",
								});
							}

							const [updatedUser] = await tx
								.update(users)
								.set({ passwordHash, updatedAt: now })
								.where(eq(users.id, record.userId))
								.returning({ email: users.email });

							await tx
								.update(passwordResetTokens)
								.set({ usedAt: now })
								.where(eq(passwordResetTokens.id, record.id));

							await tx
								.delete(sessions)
								.where(eq(sessions.userId, record.userId));

							return {
								userId: record.userId as TUserId,
								email: updatedUser?.email ?? "",
							};
						});
					},
					catch: (e) =>
						e instanceof InvalidResetTokenError
							? e
							: new DatabaseError({ cause: e }),
				}),
		};
	}),
);
