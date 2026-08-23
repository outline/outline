import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { normalizeEmail } from "@/infra/auth/email";
import {
	generateSessionToken,
	hashSessionToken,
} from "@/infra/auth/session-token";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	branches,
	branchMembers,
	businesses,
	profiles,
	sessions,
	subscriptions,
	userRoles,
	users,
} from "@/infra/db/drizzle/schema";
import { IAppConfig } from "@/shared/env/app.config";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { IAuthRepository } from "./auth.repository";
import { EmailAlreadyExistsError } from "./auth-repository.errors";

/** Drizzle's `.returning()` types as an array; an insert always yields exactly one row. */
function firstOrThrow<T>(rows: readonly T[], label: string): T {
	const row = rows[0];
	if (!row) {
		throw new Error(`Expected ${label} insert to return a row`);
	}
	return row;
}

const PG_ERROR_UNWRAP_DEPTH_LIMIT = 5;

type TPgErrorFields = {
	readonly code?: unknown;
	readonly constraint?: unknown;
};

/**
 * Drizzle wraps the driver's error in its own `DrizzleQueryError`, whose
 * `.cause` carries the real Postgres/Neon error (`pg` and
 * `@neondatabase/serverless` share the same `DatabaseError`/`NeonDbError`
 * shape exposing SQLSTATE as `.code` and the violated constraint as
 * `.constraint`). Walk `.cause` defensively — bounded, so a misbehaving
 * error chain can't loop forever — instead of assuming a fixed wrapping depth.
 */
function findPgErrorFields(
	error: unknown,
	depth = 0,
): TPgErrorFields | undefined {
	if (depth >= PG_ERROR_UNWRAP_DEPTH_LIMIT) return undefined;
	if (typeof error !== "object" || error === null) return undefined;

	const candidate = error as {
		code?: unknown;
		constraint?: unknown;
		cause?: unknown;
	};
	if (
		typeof candidate.code === "string" &&
		typeof candidate.constraint === "string"
	) {
		return candidate;
	}
	return findPgErrorFields(candidate.cause, depth + 1);
}

/**
 * Matching on the exact `users_email_key` constraint name (rather than just
 * the `23505` SQLSTATE, or the target table) is what keeps this from
 * misclassifying an unrelated unique violation on another table's insert
 * inside the same transaction as a duplicate-email signup.
 */
function isUsersEmailUniqueViolation(error: unknown): boolean {
	const pgError = findPgErrorFields(error);
	return pgError?.code === "23505" && pgError.constraint === "users_email_key";
}

export const AuthRepositoryDrizzle = Layer.effect(
	IAuthRepository,
	Effect.gen(function* () {
		const db = yield* IDrizzleClient;
		const config = yield* IAppConfig;
		const sessionTtlMs = config.session.ttlMs;

		return IAuthRepository.of({
			findUserByEmail: (email: string) =>
				Effect.tryPromise({
					try: async () => {
						const normalizedEmail = normalizeEmail(email);
						const row = await db.query.users.findFirst({
							where: { RAW: (u, { eq }) => eq(u.email, normalizedEmail) },
						});
						if (!row) return null;
						return {
							id: row.id as TUserId,
							email: row.email,
							passwordHash: row.passwordHash,
						};
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			createUserWithBusiness: (input) =>
				Effect.tryPromise({
					try: async () => {
						const normalizedEmail = normalizeEmail(input.email);
						return await db.transaction(async (tx) => {
							const user = firstOrThrow(
								await tx
									.insert(users)
									.values({
										email: normalizedEmail,
										passwordHash: input.passwordHash,
									})
									.returning({ id: users.id }),
								"users",
							);

							const business = firstOrThrow(
								await tx
									.insert(businesses)
									.values({ name: input.businessName, ownerId: user.id })
									.returning({ id: businesses.id }),
								"businesses",
							);

							await tx.insert(profiles).values({
								userId: user.id,
								businessId: business.id,
								fullName: input.fullName,
								email: normalizedEmail,
							});

							await tx.insert(userRoles).values({
								userId: user.id,
								businessId: business.id,
								role: "owner",
							});

							const branch = firstOrThrow(
								await tx
									.insert(branches)
									.values({ businessId: business.id, name: "Cabang Utama" })
									.returning({ id: branches.id }),
								"branches",
							);

							await tx.insert(branchMembers).values({
								branchId: branch.id,
								userId: user.id,
							});

							await tx.insert(subscriptions).values({
								businessId: business.id,
								plan: "free",
							});

							return {
								userId: user.id as TUserId,
								businessId: business.id as TTenantId,
							};
						});
					},
					catch: (e) =>
						isUsersEmailUniqueViolation(e)
							? new EmailAlreadyExistsError({ email: input.email })
							: new DatabaseError({ cause: e }),
				}),

			createSession: (userId: TUserId) =>
				Effect.tryPromise({
					try: async () => {
						const token = generateSessionToken();
						const tokenHash = await hashSessionToken(token);
						const expiresAt = new Date(Date.now() + sessionTtlMs);

						await db.insert(sessions).values({
							userId,
							tokenHash,
							expiresAt: expiresAt.toISOString(),
						});

						return { token, expiresAt };
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findValidSessionByTokenHash: (tokenHash: string) =>
				Effect.tryPromise({
					try: async () => {
						const now = new Date().toISOString();
						// The `expires_at` column is `timestamptz`; Drizzle's "string"
						// mode only affects the JS-side representation (ISO string in,
						// ISO string out) — Postgres still compares this as a real
						// timestamp, not lexicographically.
						const row = await db.query.sessions.findFirst({
							where: {
								RAW: (s, { and, eq, gt }) =>
									and(eq(s.tokenHash, tokenHash), gt(s.expiresAt, now)),
							},
						});
						if (!row) return null;
						return {
							userId: row.userId as TUserId,
							expiresAt: new Date(row.expiresAt),
						};
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			touchSession: (tokenHash: string) =>
				Effect.tryPromise({
					try: async () => {
						const expiresAt = new Date(Date.now() + sessionTtlMs);
						await db
							.update(sessions)
							.set({
								expiresAt: expiresAt.toISOString(),
								updatedAt: new Date().toISOString(),
							})
							.where(eq(sessions.tokenHash, tokenHash));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			deleteSessionByTokenHash: (tokenHash: string) =>
				Effect.tryPromise({
					try: async () => {
						await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			deleteSessionsByUserId: (userId: TUserId) =>
				Effect.tryPromise({
					try: async () => {
						await db.delete(sessions).where(eq(sessions.userId, userId));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),
		});
	}),
);
