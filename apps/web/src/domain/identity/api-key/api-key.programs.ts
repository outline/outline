import { Effect } from "effect";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { hashToken } from "@/shared/utils/hash";
import {
	ApiKeyExpired,
	ApiKeyNotActive,
	ApiKeyNotFound,
	ApiKeyScopeMissing,
} from "./api-key.errors";
import { buildApiKeyEntity } from "./api-key.module";
import { IApiKeyRepository } from "./api-key.repository";
import type {
	TApiKey,
	TApiKeyId,
	TApiKeyScope,
	TApiKeyValidation,
} from "./api-key.types";

export const validateApiKeyProgram = (
	authHeader: string | null | undefined,
	requiredScope?: TApiKeyScope,
): Effect.Effect<
	TApiKeyValidation,
	ApiKeyNotFound | ApiKeyNotActive | ApiKeyExpired | ApiKeyScopeMissing,
	IApiKeyRepository
> =>
	Effect.gen(function* () {
		if (!authHeader?.startsWith("Bearer ")) {
			return yield* Effect.fail(
				new ApiKeyNotFound({
					message: "Missing or invalid Authorization header",
				}),
			);
		}

		const token = authHeader.substring(7).trim();
		if (!token) {
			return yield* Effect.fail(new ApiKeyNotFound({ message: "Empty token" }));
		}

		const keyHash = yield* Effect.tryPromise({
			try: () => hashToken(token),
			catch: () => new ApiKeyNotFound({ message: "Failed to hash token" }),
		});

		const repo = yield* IApiKeyRepository;
		const key = yield* repo.findByHash(keyHash);

		if (!key) {
			return yield* Effect.fail(
				new ApiKeyNotFound({ message: "API key not found" }),
			);
		}

		if (!key.isActive) {
			return yield* Effect.fail(
				new ApiKeyNotActive({ message: "API key has been revoked" }),
			);
		}

		if (key.expiresAt && new Date(key.expiresAt).getTime() < Date.now()) {
			return yield* Effect.fail(
				new ApiKeyExpired({ message: "API key has expired" }),
			);
		}

		if (requiredScope && !key.scopes.includes(requiredScope)) {
			return yield* Effect.fail(
				new ApiKeyScopeMissing({
					message: `API key is missing required scope: ${requiredScope}`,
					requiredScope,
				}),
			);
		}

		yield* repo.recordUsage(key.id);

		return {
			businessId: key.businessId,
			keyId: key.id,
			scopes: key.scopes,
		} satisfies TApiKeyValidation;
	});

export const listApiKeysProgram = (
	businessId: TTenantId,
): Effect.Effect<readonly TApiKey[], ApiKeyNotFound, IApiKeyRepository> =>
	Effect.gen(function* () {
		const repo = yield* IApiKeyRepository;
		return yield* repo.findByBusiness(businessId);
	});

export const createApiKeyProgram = (
	businessId: TTenantId,
	name: string,
	scopes: readonly TApiKeyScope[],
	creatorId: TUserId,
	expiresAt: string | null,
): Effect.Effect<
	{ readonly key: string; readonly apiKey: TApiKey },
	ApiKeyNotFound,
	IApiKeyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IApiKeyRepository;
		const { key, entity } = buildApiKeyEntity(
			businessId,
			name,
			scopes,
			creatorId,
			expiresAt,
		);
		const apiKey = yield* repo.create(entity);
		return { key, apiKey };
	});

export const revokeApiKeyProgram = (
	businessId: TTenantId,
	keyId: TApiKeyId,
): Effect.Effect<void, ApiKeyNotFound, IApiKeyRepository> =>
	Effect.gen(function* () {
		const repo = yield* IApiKeyRepository;
		const existing = yield* repo.findById(keyId);
		if (!existing) {
			return yield* Effect.fail(
				new ApiKeyNotFound({ message: "API key not found" }),
			);
		}
		if (existing.businessId !== businessId) {
			return yield* Effect.fail(
				new ApiKeyNotFound({ message: "API key not found for this business" }),
			);
		}
		return yield* repo.revoke(keyId);
	});

export const updateApiKeyProgram = (
	businessId: TTenantId,
	keyId: TApiKeyId,
	data: {
		readonly name?: string;
		readonly scopes?: readonly TApiKeyScope[];
	},
): Effect.Effect<TApiKey, ApiKeyNotFound, IApiKeyRepository> =>
	Effect.gen(function* () {
		const repo = yield* IApiKeyRepository;
		const existing = yield* repo.findById(keyId);
		if (!existing) {
			return yield* Effect.fail(
				new ApiKeyNotFound({ message: "API key not found" }),
			);
		}
		if (existing.businessId !== businessId) {
			return yield* Effect.fail(
				new ApiKeyNotFound({ message: "API key not found for this business" }),
			);
		}
		return yield* repo.update(keyId, data);
	});
