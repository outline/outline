import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/infra/auth/password";
import type { ICache } from "@/shared/ports/cache.port";
import { ICache as ICacheTag } from "@/shared/ports/cache.port";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import {
	loginProgram,
	logoutProgram,
	signupProgram,
} from "./auth.programs.drizzle";
import type { TCreateUserWithBusinessInput } from "./auth.repository";
import { IAuthRepository } from "./auth.repository";
import { EmailAlreadyExistsError } from "./auth-repository.errors";

const userId = "user-1" as TUserId;
const businessId = "biz-1" as TTenantId;

function makeCache(): ICache {
	const store = new Map<string, unknown>();
	return {
		get: (key) => Effect.succeed((store.get(key) as never) ?? null),
		set: (key, value) => {
			store.set(key, value);
			return Effect.void;
		},
		remove: () => Effect.void,
		clear: () => Effect.void,
	};
}

const authRepoDefaults = {
	findUserByEmail: vi.fn(),
	createUserWithBusiness: vi.fn(),
	createSession: vi.fn(),
	findValidSessionByTokenHash: vi.fn(),
	touchSession: vi.fn(),
	deleteSessionByTokenHash: vi.fn(),
	deleteSessionsByUserId: vi.fn(),
};

const _identityRepoDefaults = {
	findProfileByUserId: vi.fn(),
	updateProfile: vi.fn(),
	updateEmail: vi.fn(),
	findBusinessById: vi.fn(),
	updateBusiness: vi.fn(),
	checkRole: vi.fn(),
	verifyCurrentPassword: vi.fn(),
	changePassword: vi.fn(),
	verifyPin: vi.fn(),
};

describe("signupProgram", () => {
	it("creates a user with hashed password and returns ids", async () => {
		const authRepo = {
			...authRepoDefaults,
			createUserWithBusiness: vi.fn((_input: TCreateUserWithBusinessInput) =>
				Effect.succeed({ userId, businessId }),
			),
		};

		const result = await Effect.runPromise(
			Effect.provide(
				signupProgram({
					email: "new@example.com",
					password: "s3cret-password",
					fullName: "New User",
					businessName: "New Business",
				}),
				Layer.succeed(IAuthRepository, authRepo),
			),
		);

		expect(result).toEqual({ userId, businessId });
		const callArg = authRepo.createUserWithBusiness.mock
			.calls[0]?.[0] as TCreateUserWithBusinessInput;
		expect(callArg.passwordHash).not.toBe("s3cret-password");
		expect(callArg.passwordHash.split(":")).toHaveLength(2);
	});

	it("propagates EmailAlreadyExistsError", async () => {
		const authRepo = {
			...authRepoDefaults,
			createUserWithBusiness: vi.fn(() =>
				Effect.fail(new EmailAlreadyExistsError({ email: "dup@example.com" })),
			),
		};

		const result = Effect.runPromiseExit(
			Effect.provide(
				signupProgram({
					email: "dup@example.com",
					password: "whatever123",
					fullName: "Dup",
					businessName: "Dup Business",
				}),
				Layer.succeed(IAuthRepository, authRepo),
			),
		);

		await expect(result).resolves.toMatchObject({
			_tag: "Failure",
		});
	});
});

describe("loginProgram", () => {
	it("returns a session token on correct credentials", async () => {
		const passwordHash = await hashPassword("correct-password");
		const authRepo = {
			...authRepoDefaults,
			findUserByEmail: vi.fn(() =>
				Effect.succeed({ id: userId, email: "user@example.com", passwordHash }),
			),
			createSession: vi.fn(() =>
				Effect.succeed({ token: "opaque-token", expiresAt: new Date() }),
			),
		};

		const result = await Effect.runPromise(
			Effect.provide(
				loginProgram({
					email: "user@example.com",
					password: "correct-password",
				}),
				Layer.mergeAll(
					Layer.succeed(IAuthRepository, authRepo),
					Layer.succeed(ICacheTag, makeCache()),
				),
			),
		);

		expect(result.token).toBe("opaque-token");
	});

	it("fails with InvalidCredentialsError on wrong password", async () => {
		const passwordHash = await hashPassword("correct-password");
		const authRepo = {
			...authRepoDefaults,
			findUserByEmail: vi.fn(() =>
				Effect.succeed({ id: userId, email: "user@example.com", passwordHash }),
			),
		};

		const exit = await Effect.runPromiseExit(
			Effect.provide(
				loginProgram({ email: "user@example.com", password: "wrong-password" }),
				Layer.mergeAll(
					Layer.succeed(IAuthRepository, authRepo),
					Layer.succeed(ICacheTag, makeCache()),
				),
			),
		);

		expect(exit._tag).toBe("Failure");
	});

	it("fails with InvalidCredentialsError when email is unknown (no user enumeration)", async () => {
		const authRepo = {
			...authRepoDefaults,
			findUserByEmail: vi.fn(() => Effect.succeed(null)),
		};

		const exit = await Effect.runPromiseExit(
			Effect.provide(
				loginProgram({ email: "unknown@example.com", password: "whatever123" }),
				Layer.mergeAll(
					Layer.succeed(IAuthRepository, authRepo),
					Layer.succeed(ICacheTag, makeCache()),
				),
			),
		);

		expect(exit._tag).toBe("Failure");
	});

	it("fails with RateLimitedError after 5 attempts for the same email", async () => {
		const authRepo = {
			...authRepoDefaults,
			findUserByEmail: vi.fn(() => Effect.succeed(null)),
		};
		const cache = makeCache();
		const layer = Layer.mergeAll(
			Layer.succeed(IAuthRepository, authRepo),
			Layer.succeed(ICacheTag, cache),
		);

		for (let i = 0; i < 5; i++) {
			await Effect.runPromiseExit(
				Effect.provide(
					loginProgram({ email: "brute@example.com", password: "x" }),
					layer,
				),
			);
		}

		const sixth = await Effect.runPromiseExit(
			Effect.provide(
				loginProgram({ email: "brute@example.com", password: "x" }),
				layer,
			),
		);

		expect(sixth._tag).toBe("Failure");
		if (sixth._tag === "Failure") {
			expect(String(sixth.cause)).toContain("RateLimitedError");
		}
	});
});

describe("logoutProgram", () => {
	it("deletes the session by token hash", async () => {
		const authRepo = {
			...authRepoDefaults,
			deleteSessionByTokenHash: vi.fn(() => Effect.void),
		};

		await Effect.runPromise(
			Effect.provide(
				logoutProgram("some-token"),
				Layer.succeed(IAuthRepository, authRepo),
			),
		);

		expect(authRepo.deleteSessionByTokenHash).toHaveBeenCalled();
	});
});
