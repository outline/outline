import { Effect, Layer } from "effect";
import {
	getBusinessIdProgram,
	getRawProfileProgram,
	IdentityRepositoryDrizzle,
} from "@/domain/identity";
import type { TProfile } from "@/domain/identity/identity.types";
import { DrizzleClientLive } from "@/infra/db/drizzle/client";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

const identityRepoLayer = Layer.provide(
	IdentityRepositoryDrizzle,
	DrizzleClientLive,
);

export const getBusinessIdForUser = (
	userId: TUserId,
): Promise<TTenantId | null> =>
	Effect.runPromise(
		Effect.provide(getBusinessIdProgram(userId), identityRepoLayer),
	);

export const getProfileForUser = (userId: TUserId): Promise<TProfile | null> =>
	Effect.runPromise(
		Effect.provide(getRawProfileProgram(userId), identityRepoLayer),
	);
