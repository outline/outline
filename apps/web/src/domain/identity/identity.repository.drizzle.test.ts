// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { hashPassword } from "@/infra/auth/password";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { AppConfigLive } from "@/shared/env/app.config";
import { IAuthRepository } from "./auth/auth.repository";
import { AuthRepositoryDrizzle } from "./auth/auth.repository.drizzle";
import { IIdentityRepository } from "./identity.repository";
import { IdentityRepositoryDrizzle } from "./identity.repository.drizzle";

const hasDb = Boolean(process.env.DATABASE_URL);

// `DrizzleClientLive` is now `Layer.scoped`; its pool closes once the scope it
// was built against closes. `Effect.provide(IDrizzleClient, DrizzleClientLive)`
// ties that scope to the lifetime of `IDrizzleClient` alone, which resolves
// instantly — so `getDb()` callers reusing the returned client afterward (as
// every test below does) need a shared, longer-lived scope instead of letting
// `Effect.provide` open-and-immediately-close one per call.
const dbScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getDb = () =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			dbScope!,
		),
	);

describe.skipIf(!hasDb)("identity repository (integration)", () => {
	const email = `__smoke_test_identity_${Date.now()}@example.com`;

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// `businesses.owner_id` has no FK/cascade back to `users`, so the
		// business (and everything cascading from it — profiles, user_roles,
		// branches, branch_members, subscriptions) must be deleted explicitly
		// before the user row, or it would leak on every test run. Mirrors
		// Task 5's auth.repository.drizzle.test.ts cleanup.
		await db.execute(
			sql`DELETE FROM businesses WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '__smoke_test_identity_%')`,
		);
		await db.execute(
			sql`DELETE FROM users WHERE email LIKE '__smoke_test_identity_%'`,
		);
	});

	it("reads back a profile and business created via signup, and verifies password change", async () => {
		const passwordHash = await hashPassword("initial-password");

		const { userId, businessId } = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* IAuthRepository;
					return yield* repo.createUserWithBusiness({
						email,
						passwordHash,
						fullName: "Identity Test User",
						businessName: "Identity Test Business",
					});
				}),
				Layer.provide(
					AuthRepositoryDrizzle,
					Layer.mergeAll(DrizzleClientLive, AppConfigLive),
				),
			),
		);

		const identityLayer = Layer.provide(
			IdentityRepositoryDrizzle,
			DrizzleClientLive,
		);

		const profile = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* IIdentityRepository;
					return yield* repo.findProfileByUserId(userId);
				}),
				identityLayer,
			),
		);
		expect(profile?.email).toBe(email);
		expect(profile?.businessId).toBe(businessId);

		const business = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* IIdentityRepository;
					return yield* repo.findBusinessById(businessId);
				}),
				identityLayer,
			),
		);
		expect(business?.name).toBe("Identity Test Business");

		const hasOwnerRole = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* IIdentityRepository;
					return yield* repo.checkRole(userId, businessId, "owner");
				}),
				identityLayer,
			),
		);
		expect(hasOwnerRole).toBe(true);

		await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* IIdentityRepository;
					yield* repo.changePassword(userId, "new-password");
				}),
				identityLayer,
			),
		);

		const verifiedNew = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* IIdentityRepository;
					return yield* repo.verifyCurrentPassword(userId, "new-password");
				}),
				identityLayer,
			),
		);
		expect(verifiedNew).toBe(true);

		const verifiedOld = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* IIdentityRepository;
					return yield* repo.verifyCurrentPassword(userId, "initial-password");
				}),
				identityLayer,
			),
		);
		expect(verifiedOld).toBe(false);
	}, 15000);
});
