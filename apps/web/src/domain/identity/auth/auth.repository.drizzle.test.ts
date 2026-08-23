// @vitest-environment node
import { sql } from "drizzle-orm";
import { Cause, Context, Effect, Exit, Layer, Option, Scope } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { hashPassword } from "@/infra/auth/password";
import { hashSessionToken } from "@/infra/auth/session-token";
import {
	type DrizzleClient,
	DrizzleClientLive,
	IDrizzleClient,
} from "@/infra/db/drizzle/client";
import { AppConfigLive } from "@/shared/env/app.config";
import { IAuthRepository } from "./auth.repository";
import { AuthRepositoryDrizzle } from "./auth.repository.drizzle";

const hasDb = Boolean(process.env.DATABASE_URL);

const authRepoLayer = Layer.provide(
	AuthRepositoryDrizzle,
	Layer.mergeAll(DrizzleClientLive, AppConfigLive),
);

const runWithRepo = <A, E>(
	effect: Effect.Effect<A, E, IAuthRepository>,
): Promise<A> => Effect.runPromise(Effect.provide(effect, authRepoLayer));

/** For asserting on the typed failure channel rather than the generic promise rejection. */
const runWithRepoExit = <A, E>(
	effect: Effect.Effect<A, E, IAuthRepository>,
): Promise<Exit.Exit<A, E | unknown>> =>
	Effect.runPromiseExit(Effect.provide(effect, authRepoLayer));

// `DrizzleClientLive` is now `Layer.scoped`; its pool closes once the scope it
// was built against closes. `Effect.provide(IDrizzleClient, DrizzleClientLive)`
// ties that scope to the lifetime of `IDrizzleClient` alone, which resolves
// instantly — so `getDb()` callers reusing the returned client afterward (as
// every test below does) need a shared, longer-lived scope instead of letting
// `Effect.provide` open-and-immediately-close one per call.
const dbScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getDb = (): Promise<DrizzleClient> =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			dbScope!,
		),
	);

type TRowCounts = { readonly businesses: number; readonly profiles: number };

/** Scoped to a single test email so it's safe to call before/after a signup attempt. */
const countBusinessAndProfileRows = async (
	db: DrizzleClient,
	forEmail: string,
): Promise<TRowCounts> => {
	const result = await db.execute<{ businesses: number; profiles: number }>(sql`
		SELECT
			(SELECT COUNT(*)::int FROM businesses WHERE owner_id IN (SELECT id FROM users WHERE email = ${forEmail})) AS businesses,
			(SELECT COUNT(*)::int FROM profiles WHERE email = ${forEmail}) AS profiles
	`);
	const row = result.rows[0];
	return {
		businesses: Number(row?.businesses ?? 0),
		profiles: Number(row?.profiles ?? 0),
	};
};

describe.skipIf(!hasDb)("auth repository (integration)", () => {
	const email = `__smoke_test_authrepo_${Date.now()}@example.com`;

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// `businesses.owner_id` has no FK/cascade back to `users`, so the
		// business (and everything cascading from it — profiles, user_roles,
		// branches, branch_members, subscriptions) must be deleted explicitly
		// before the user row, or it would leak on every test run.
		await db.execute(
			sql`DELETE FROM businesses WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '__smoke_test_authrepo_%')`,
		);
		await db.execute(
			sql`DELETE FROM users WHERE email LIKE '__smoke_test_authrepo_%'`,
		);
	});

	it("creates a user with business, then finds it by email", async () => {
		const passwordHash = await hashPassword("s3cret-password");

		const result = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				return yield* repo.createUserWithBusiness({
					email,
					passwordHash,
					fullName: "Smoke Test User",
					businessName: "Smoke Test Business",
				});
			}),
		);

		expect(result.userId).toBeTruthy();
		expect(result.businessId).toBeTruthy();

		const found = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				return yield* repo.findUserByEmail(email);
			}),
		);
		expect(found?.email).toBe(email);
	}, 15000);

	it("rejects a duplicate email with a typed EmailAlreadyExistsError and leaves no partial rows", async () => {
		const passwordHash = await hashPassword("another-password");
		const db = await getDb();

		const before = await countBusinessAndProfileRows(db, email);

		const exit = await runWithRepoExit(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				return yield* repo.createUserWithBusiness({
					email, // same email as the previous test — runs after it
					passwordHash,
					fullName: "Duplicate",
					businessName: "Duplicate Business",
				});
			}),
		);

		// The Effect's failure channel — not the FiberFailure wrapper a bare
		// `rejects` assertion would see — is what carries the typed error, so
		// assert on `Cause.failureOption` rather than `instanceof` on a rejection.
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const failure = Cause.failureOption(exit.cause);
			expect(Option.isSome(failure)).toBe(true);
			if (Option.isSome(failure)) {
				expect((failure.value as { _tag: string })._tag).toBe(
					"EmailAlreadyExistsError",
				);
			}
		}

		// Atomicity: the rejected signup must not have written any rows —
		// business/profile counts for this email are unchanged.
		const after = await countBusinessAndProfileRows(db, email);
		expect(after).toEqual(before);
	}, 15000);

	it("creates, finds, touches, and deletes a session", async () => {
		const user = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				return yield* repo.findUserByEmail(email);
			}),
		);
		if (!user) throw new Error("setup failed: user not found");

		const { token } = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				return yield* repo.createSession(user.id);
			}),
		);

		const tokenHash = await hashSessionToken(token);

		const found = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				return yield* repo.findValidSessionByTokenHash(tokenHash);
			}),
		);
		expect(found?.userId).toBe(user.id);
		if (!found) throw new Error("setup failed: session not found");

		await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				yield* repo.touchSession(tokenHash);
			}),
		);

		const touched = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				return yield* repo.findValidSessionByTokenHash(tokenHash);
			}),
		);
		expect(touched?.userId).toBe(user.id);
		// Sliding expiration: touchSession must push expiresAt strictly forward.
		expect(touched?.expiresAt.getTime()).toBeGreaterThan(
			found.expiresAt.getTime(),
		);

		await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				yield* repo.deleteSessionByTokenHash(tokenHash);
			}),
		);

		const afterDelete = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IAuthRepository;
				return yield* repo.findValidSessionByTokenHash(tokenHash);
			}),
		);
		expect(afterDelete).toBeNull();
	}, 15000);
});
