import { Effect, Layer } from "effect";
import type { TSessionDto } from "@treonstudio/petso-lib";
import {
	loginProgram,
	logoutProgram,
	signupProgram,
	validateSessionProgram,
} from "@/domain/identity/auth/auth.programs.drizzle";
import { UpstashCacheAdapterLive } from "@/infra/adapters/upstash.adapter";
import { DrizzleClientLive } from "@/infra/db/drizzle/client";
import { AppConfigLive } from "@/shared/env/app.config";
import type { AuthProgramDependencies } from "./auth.handlers";
import { AuthRepositoryDrizzle } from "@/domain/identity/auth/auth.repository.drizzle";
import { IIdentityRepository } from "@/domain/identity/identity.repository";
import { IdentityRepositoryDrizzle } from "@/domain/identity/identity.repository.drizzle";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

const dbConfigLayer = Layer.mergeAll(DrizzleClientLive, AppConfigLive);
const authRepoLayer = Layer.provide(AuthRepositoryDrizzle, dbConfigLayer);
const identityRepoLayer = Layer.provide(IdentityRepositoryDrizzle, dbConfigLayer);
const cacheLayer = Layer.provide(UpstashCacheAdapterLive, AppConfigLive);

/**
 * Creates authentication dependencies backed by the Pet Store Drizzle
 * database and rate-limit cache.
 *
 * @returns direct HTTP handler dependencies for authentication programs.
 */
export function createAuthProgramDependencies(): AuthProgramDependencies {
	return {
		login: async (input) =>
			Effect.runPromise(
				Effect.provide(
					loginProgram(input),
					Layer.mergeAll(authRepoLayer, cacheLayer),
				),
			),
		signup: async (input) => {
			const account = await Effect.runPromise(
				Effect.provide(signupProgram(input), authRepoLayer),
			);
			const session = await Effect.runPromise(
				Effect.provide(
					loginProgram({ email: input.email, password: input.password }),
					Layer.mergeAll(authRepoLayer, cacheLayer),
				),
			);
			return {
				userId: account.userId,
				businessId: account.businessId,
				token: session.token,
			};
		},
		logout: async (token) => {
			await Effect.runPromise(
				Effect.provide(logoutProgram(token), authRepoLayer),
			);
		},
		session: async (token): Promise<TSessionDto | null> => {
			const validated = await Effect.runPromise(
				Effect.provide(validateSessionProgram(token), authRepoLayer),
			);
			if (!validated) return null;

			return Effect.runPromise(
				Effect.provide(
					Effect.gen(function* () {
						const repository = yield* IIdentityRepository;
						const userId = validated.userId as TUserId;
						const profile = yield* repository.findProfileByUserId(userId);
						if (!profile?.businessId) return null;

						const businessId = profile.businessId as TTenantId;
						const business = yield* repository.findBusinessById(businessId);
						if (!business) return null;
						const isOwner = yield* repository.checkRole(
							userId,
							businessId,
							"owner",
						);
						const isManager = yield* repository.checkRole(
							userId,
							businessId,
							"manager",
						);
						const branches = yield* repository.findBranchesForUser(userId);
						const role = isOwner
							? "owner"
							: isManager
								? "manager"
								: "staff_daycare";

						return {
							user: {
								id: userId,
								email: profile.email ?? "",
								name: profile.fullName ?? "",
								avatarUrl: null,
								language: "en_US",
								role,
							},
							business: {
								id: business.id,
								name: business.name,
								slug: business.slug ?? "",
								logoUrl: business.logoUrl,
							},
							branches,
							permissions: {
								isAdmin: isOwner || isManager,
								manageBranches: isOwner || isManager,
							},
						} satisfies TSessionDto;
					}),
					identityRepoLayer,
				),
			);
		},
	};
}
