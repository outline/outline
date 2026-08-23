import { eq, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { hashToken } from "@/infra/auth/api-auth";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { businessApiKeys } from "@/infra/db/drizzle/schema";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { ApiKeyNotFound } from "./api-key.errors";
import { IApiKeyRepository } from "./api-key.repository";
import type {
	TApiKey,
	TApiKeyCreate,
	TApiKeyId,
	TApiKeyScope,
} from "./api-key.types";

const toDomain = (row: typeof businessApiKeys.$inferSelect): TApiKey => ({
	id: row.id as TApiKeyId,
	businessId: row.businessId as TTenantId,
	keyHash: row.keyHash,
	prefix: row.prefix,
	name: row.name,
	scopes: (row.scopes ?? []) as readonly TApiKeyScope[],
	isActive: row.isActive,
	creatorId: row.creatorId as TUserId | null,
	expiresAt: row.expiresAt,
	revokedAt: row.revokedAt,
	rotatedFromKeyId: row.rotatedFromKeyId,
	lastUsedAt: row.lastUsedAt,
	createdAt: row.createdAt,
});

const mapErr = (e: unknown): ApiKeyNotFound =>
	new ApiKeyNotFound({
		message: e instanceof Error ? e.message : "Database error",
	});

export const ApiKeyRepositoryDrizzleLive = Layer.effect(
	IApiKeyRepository,
	Effect.gen(function* () {
		const db = yield* IDrizzleClient;

		const findByHash = (keyHash: string) =>
			Effect.tryPromise({
				try: () =>
					db
						.select()
						.from(businessApiKeys)
						.where(eq(businessApiKeys.keyHash, keyHash))
						.limit(1)
						.then((rows) => (rows[0] ? toDomain(rows[0]) : null)),
				catch: mapErr,
			});

		const findByBusiness = (businessId: TTenantId) =>
			Effect.tryPromise({
				try: () =>
					db
						.select()
						.from(businessApiKeys)
						.where(eq(businessApiKeys.businessId, businessId))
						.orderBy(businessApiKeys.createdAt)
						.then((rows) => rows.map(toDomain)),
				catch: mapErr,
			});

		const findById = (id: TApiKeyId) =>
			Effect.tryPromise({
				try: () =>
					db
						.select()
						.from(businessApiKeys)
						.where(eq(businessApiKeys.id, id))
						.limit(1)
						.then((rows) => (rows[0] ? toDomain(rows[0]) : null)),
				catch: mapErr,
			});

		const create = (input: TApiKeyCreate) =>
			Effect.tryPromise({
				try: async () => {
					const keyHash = await hashToken(input.plainTextKey);
					const [row] = await db
						.insert(businessApiKeys)
						.values({
							keyHash,
							prefix: input.plainTextKey.substring(0, 8),
							name: input.name,
							businessId: input.businessId,
							scopes: input.scopes as unknown as string[],
							isActive: true,
							creatorId: input.creatorId,
							expiresAt: input.expiresAt ?? null,
							rotatedFromKeyId: null,
						})
						.returning();
					if (!row) throw new Error("API key creation failed");
					return toDomain(row);
				},
				catch: mapErr,
			});

		const update = (
			id: TApiKeyId,
			data: { name?: string; scopes?: readonly TApiKeyScope[] },
		) =>
			Effect.tryPromise({
				try: async () => {
					const [row] = await db
						.update(businessApiKeys)
						.set({
							...(data.name ? { name: data.name } : {}),
							...(data.scopes
								? { scopes: data.scopes as unknown as string[] }
								: {}),
						})
						.where(eq(businessApiKeys.id, id))
						.returning();
					if (!row) throw new Error("API key not found");
					return toDomain(row);
				},
				catch: mapErr,
			});

		const revoke = (id: TApiKeyId) =>
			Effect.tryPromise({
				try: () =>
					db
						.update(businessApiKeys)
						.set({
							isActive: false,
							revokedAt: sql`now()`,
						})
						.where(eq(businessApiKeys.id, id))
						.then(() => undefined),
				catch: mapErr,
			});

		const recordUsage = (id: TApiKeyId) =>
			Effect.tryPromise({
				try: () =>
					db
						.update(businessApiKeys)
						.set({
							lastUsedAt: sql`now()`,
						})
						.where(eq(businessApiKeys.id, id))
						.then(() => undefined),
				catch: mapErr,
			});

		return {
			findByHash,
			findByBusiness,
			findById,
			create,
			update,
			revoke,
			recordUsage,
		};
	}),
);
