import { Context, type Effect } from "effect";
import type { TTenantId } from "@/shared/types/common.types";
import type { ApiKeyNotFound } from "./api-key.errors";
import type {
	TApiKey,
	TApiKeyCreate,
	TApiKeyId,
	TApiKeyScope,
} from "./api-key.types";

export class IApiKeyRepository extends Context.Tag("IApiKeyRepository")<
	IApiKeyRepository,
	{
		readonly findByHash: (
			keyHash: string,
		) => Effect.Effect<TApiKey | null, ApiKeyNotFound>;

		readonly findByBusiness: (
			businessId: TTenantId,
		) => Effect.Effect<readonly TApiKey[], ApiKeyNotFound>;

		readonly findById: (
			id: TApiKeyId,
		) => Effect.Effect<TApiKey | null, ApiKeyNotFound>;

		readonly create: (
			input: TApiKeyCreate,
		) => Effect.Effect<TApiKey, ApiKeyNotFound>;

		readonly update: (
			id: TApiKeyId,
			data: {
				readonly name?: string;
				readonly scopes?: readonly TApiKeyScope[];
			},
		) => Effect.Effect<TApiKey, ApiKeyNotFound>;

		readonly revoke: (id: TApiKeyId) => Effect.Effect<void, ApiKeyNotFound>;

		readonly recordUsage: (
			id: TApiKeyId,
		) => Effect.Effect<void, ApiKeyNotFound>;
	}
>() {}
