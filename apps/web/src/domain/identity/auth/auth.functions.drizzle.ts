import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { UpstashCacheAdapterLive } from "@/infra/adapters/upstash.adapter";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import {
	clearSessionCookie,
	getSessionCookieValue,
	setSessionCookie,
} from "@/infra/auth/cookie";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { profiles } from "@/infra/db/drizzle/schema";
import { AppConfigLive } from "@/shared/env/app.config";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import type { TSessionInfo } from "@/shared/types/session.types";
import { IIdentityRepository } from "../identity.repository";
import { IdentityRepositoryDrizzle } from "../identity.repository.drizzle";
import {
	loginProgram,
	logoutProgram,
	signupProgram,
	validateSessionProgram,
} from "./auth.programs.drizzle";
import { AuthRepositoryDrizzle } from "./auth.repository.drizzle";

const SignupSchema = Schema.Struct({
	email: Schema.String,
	password: Schema.String,
	fullName: Schema.String,
	businessName: Schema.String,
});

const LoginSchema = Schema.Struct({
	email: Schema.String,
	password: Schema.String,
});

// Full layer stack these server functions need: auth repo + identity repo,
// both backed by the same Drizzle client, plus the cache adapter (rate
// limiting) and its config dependency.
const dbConfigLayer = Layer.mergeAll(DrizzleClientLive, AppConfigLive);
const authRepoLayer = Layer.provide(AuthRepositoryDrizzle, dbConfigLayer);
const identityRepoLayer = Layer.provide(
	IdentityRepositoryDrizzle,
	dbConfigLayer,
);
const cacheLayer = Layer.provide(UpstashCacheAdapterLive, AppConfigLive);

export const signupV2 = createServerFn({ method: "POST" })
	.validator(Schema.decodeUnknownSync(SignupSchema))
	.handler(async ({ data }) => {
		const result = await Effect.runPromise(
			Effect.provide(signupProgram(data), authRepoLayer),
		);

		const session = await Effect.runPromise(
			Effect.provide(
				loginProgram({ email: data.email, password: data.password }),
				Layer.mergeAll(authRepoLayer, cacheLayer),
			),
		);

		setSessionCookie(session.token);
		return { userId: result.userId, businessId: result.businessId };
	});

export const loginV2 = createServerFn({ method: "POST" })
	.validator(Schema.decodeUnknownSync(LoginSchema))
	.handler(async ({ data }) => {
		const session = await Effect.runPromise(
			Effect.provide(
				loginProgram(data),
				Layer.mergeAll(authRepoLayer, cacheLayer),
			),
		);

		setSessionCookie(session.token);
		return { userId: session.userId };
	});

export const logoutV2 = createServerFn({ method: "POST" }).handler(async () => {
	const token = getSessionCookieValue();
	if (token) {
		await Effect.runPromise(
			Effect.provide(logoutProgram(token), authRepoLayer),
		);
	}
	clearSessionCookie();
	return { success: true };
});

export const getSessionInfoV2 = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }): Promise<TSessionInfo | null> => {
		const userId = context.userId as TUserId;

		const profile = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* IIdentityRepository;
					return yield* repo.findProfileByUserId(userId);
				}),
				identityRepoLayer,
			),
		);
		if (!profile?.businessId) return null;

		const businessId = profile.businessId as TTenantId;

		const [business, isOwner, isManager, branches, hasPinSet] =
			await Promise.all([
				Effect.runPromise(
					Effect.provide(
						Effect.gen(function* () {
							const repo = yield* IIdentityRepository;
							return yield* repo.findBusinessById(businessId);
						}),
						identityRepoLayer,
					),
				),
				Effect.runPromise(
					Effect.provide(
						Effect.gen(function* () {
							const repo = yield* IIdentityRepository;
							return yield* repo.checkRole(userId, businessId, "owner");
						}),
						identityRepoLayer,
					),
				),
				Effect.runPromise(
					Effect.provide(
						Effect.gen(function* () {
							const repo = yield* IIdentityRepository;
							return yield* repo.checkRole(userId, businessId, "manager");
						}),
						identityRepoLayer,
					),
				),
				Effect.runPromise(
					Effect.provide(
						Effect.gen(function* () {
							const repo = yield* IIdentityRepository;
							return yield* repo.findBranchesForUser(userId);
						}),
						identityRepoLayer,
					),
				),
				Effect.runPromise(
					Effect.provide(
						Effect.gen(function* () {
							const repo = yield* IIdentityRepository;
							return yield* repo.hasPinSet(userId);
						}),
						identityRepoLayer,
					),
				),
			]);

		const role = isOwner ? "owner" : isManager ? "manager" : "staff_daycare";

		return {
			userId,
			email: profile.email ?? "",
			fullName: profile.fullName ?? "",
			businessId,
			businessName: business?.name ?? "",
			businessSlug: business?.slug ?? "",
			businessLogoUrl: business?.logoUrl ?? null,
			businessSignatureUrl: business?.signatureUrl ?? null,
			businessAddress: business?.address ?? null,
			businessPhone: business?.phone ?? null,
			role,
			isAdmin: isOwner || isManager,
			hasPinSet,
			branches: [...branches],
		};
	});

export const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
	const request = getRequest();
	if (!request) return false;

	const token = getSessionCookieValue();
	if (!token) return false;

	const session = await Effect.runPromise(
		Effect.provide(validateSessionProgram(token), authRepoLayer),
	);
	return !!session;
});

export const updateLanguage = createServerFn({ method: "POST" })
	.validator((lang: unknown) => lang as string)
	.handler(async ({ data: lang }): Promise<void> => {
		const request = getRequest();
		if (!request) return;
		const token = getSessionCookieValue();
		if (!token) return;
		const session = await Effect.runPromise(
			Effect.provide(validateSessionProgram(token), authRepoLayer),
		);
		if (!session) return;

		// The update must run *inside* the same `Effect.provide(..., DrizzleClientLive)`
		// call that builds the client — DrizzleClientLive is now Layer.scoped, so its
		// pool closes as soon as the provided effect finishes. A separate, nested
		// `Effect.runPromise(Effect.provide(IDrizzleClient, ...))` (the previous
		// shape here) would build-and-immediately-close its own pool before this
		// query ever ran.
		await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const db = yield* IDrizzleClient;
					yield* Effect.tryPromise({
						try: () =>
							db
								.update(profiles)
								.set({
									preferredLanguage: lang,
									updatedAt: new Date().toISOString(),
								})
								.where(eq(profiles.userId, session.userId)),
						catch: (e) => new DatabaseError({ cause: e as Error }),
					});
				}),
				DrizzleClientLive,
			),
		);
	});
