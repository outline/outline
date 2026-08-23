import { Effect } from "effect";
import { normalizeEmail } from "@/infra/auth/email";
import { hashPassword, verifyPassword } from "@/infra/auth/password";
import {
	isLoginRateLimited,
	recordLoginFailure,
	resetLoginRateLimit,
} from "@/infra/auth/rate-limiter";
import { hashSessionToken } from "@/infra/auth/session-token";
import { ICache } from "@/shared/ports/cache.port";
import type { TUserId } from "@/shared/types/common.types";
import { InvalidCredentialsError, RateLimitedError } from "./auth.errors";
import { IAuthRepository } from "./auth.repository";

export type TSignupInput = {
	readonly email: string;
	readonly password: string;
	readonly fullName: string;
	readonly businessName: string;
};

export const signupProgram = (input: TSignupInput) =>
	Effect.gen(function* () {
		const repo = yield* IAuthRepository;
		const passwordHash = yield* Effect.promise(() =>
			hashPassword(input.password),
		);
		return yield* repo.createUserWithBusiness({
			email: normalizeEmail(input.email),
			passwordHash,
			fullName: input.fullName,
			businessName: input.businessName,
		});
	});

export type TLoginInput = {
	readonly email: string;
	readonly password: string;
};

export const loginProgram = (input: TLoginInput) =>
	Effect.gen(function* () {
		const cache = yield* ICache;
		const repo = yield* IAuthRepository;
		const email = normalizeEmail(input.email);
		const rateLimitKey = `login:${email}`;

		const limited = yield* isLoginRateLimited(cache, rateLimitKey).pipe(
			Effect.catchAll(() => Effect.succeed(false)), // cache outage shouldn't lock users out
		);
		if (limited) {
			return yield* Effect.fail(new RateLimitedError({}));
		}

		const user = yield* repo.findUserByEmail(email);
		if (!user) {
			yield* recordLoginFailure(cache, rateLimitKey).pipe(
				Effect.catchAll(() => Effect.void),
			);
			return yield* Effect.fail(new InvalidCredentialsError({}));
		}

		const valid = yield* Effect.promise(() =>
			verifyPassword(input.password, user.passwordHash),
		);
		if (!valid) {
			yield* recordLoginFailure(cache, rateLimitKey).pipe(
				Effect.catchAll(() => Effect.void),
			);
			return yield* Effect.fail(new InvalidCredentialsError({}));
		}

		yield* resetLoginRateLimit(cache, rateLimitKey).pipe(
			Effect.catchAll(() => Effect.void),
		);

		const session = yield* repo.createSession(user.id);
		return {
			token: session.token,
			expiresAt: session.expiresAt,
			userId: user.id,
		};
	});

export const logoutProgram = (token: string) =>
	Effect.gen(function* () {
		const repo = yield* IAuthRepository;
		const tokenHash = yield* Effect.promise(() => hashSessionToken(token));
		yield* repo.deleteSessionByTokenHash(tokenHash);
	});

export type TValidatedSession = {
	readonly userId: TUserId;
};

/**
 * Validates a session token against the DB, sliding its expiration forward
 * on success. Returns null (not a failure) when the token is missing/expired
 * — callers treat that as "not logged in", not an error condition.
 */
export const validateSessionProgram = (token: string) =>
	Effect.gen(function* () {
		const repo = yield* IAuthRepository;
		const tokenHash = yield* Effect.promise(() => hashSessionToken(token));
		const session = yield* repo.findValidSessionByTokenHash(tokenHash);
		if (!session) return null;

		yield* repo.touchSession(tokenHash);
		return { userId: session.userId } satisfies TValidatedSession;
	});
