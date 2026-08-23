// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { UpstashCacheAdapterLive } from "@/infra/adapters/upstash.adapter";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { AppConfigLive } from "@/shared/env/app.config";
import {
	loginProgram,
	logoutProgram,
	signupProgram,
	validateSessionProgram,
} from "./auth.programs.drizzle";
import { AuthRepositoryDrizzle } from "./auth.repository.drizzle";

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

const authRepoLayer = Layer.provide(
	AuthRepositoryDrizzle,
	Layer.mergeAll(DrizzleClientLive, AppConfigLive),
);
const cacheLayer = Layer.provide(UpstashCacheAdapterLive, AppConfigLive);

describe.skipIf(!hasDb)("auth end-to-end (integration)", () => {
	const email = `__smoke_test_e2e_${Date.now()}@example.com`;

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM users WHERE email LIKE '__smoke_test_e2e_%'`,
		);
	});

	it("signs up, logs in, validates the session, then logs out and the session stops validating", async () => {
		const signupResult = await Effect.runPromise(
			Effect.provide(
				signupProgram({
					email,
					password: "e2e-test-password",
					fullName: "E2E Test User",
					businessName: "E2E Test Business",
				}),
				authRepoLayer,
			),
		);
		expect(signupResult.userId).toBeTruthy();

		const loginResult = await Effect.runPromise(
			Effect.provide(
				loginProgram({ email, password: "e2e-test-password" }),
				Layer.mergeAll(authRepoLayer, cacheLayer),
			),
		);
		expect(loginResult.token).toBeTruthy();
		expect(loginResult.userId).toBe(signupResult.userId);

		const validated = await Effect.runPromise(
			Effect.provide(validateSessionProgram(loginResult.token), authRepoLayer),
		);
		expect(validated?.userId).toBe(signupResult.userId);

		await Effect.runPromise(
			Effect.provide(logoutProgram(loginResult.token), authRepoLayer),
		);

		const afterLogout = await Effect.runPromise(
			Effect.provide(validateSessionProgram(loginResult.token), authRepoLayer),
		);
		expect(afterLogout).toBeNull();
	}, 20000);

	it("rejects login with the wrong password without creating a session", async () => {
		await Effect.runPromise(
			Effect.provide(
				signupProgram({
					email: `${email}_2`,
					password: "correct-password",
					fullName: "E2E Test User 2",
					businessName: "E2E Test Business 2",
				}),
				authRepoLayer,
			),
		);

		const exit = await Effect.runPromiseExit(
			Effect.provide(
				loginProgram({ email: `${email}_2`, password: "wrong-password" }),
				Layer.mergeAll(authRepoLayer, cacheLayer),
			),
		);

		expect(exit._tag).toBe("Failure");
	}, 20000);
});
