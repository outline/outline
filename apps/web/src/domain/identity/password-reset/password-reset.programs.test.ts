import { Effect, type Exit, Layer, Redacted } from "effect";
import { runPromise, runPromiseExit } from "effect/Effect";
import { describe, expect, it, vi } from "vitest";
import {
	IAuthRepository,
	type TAuthUser,
} from "@/domain/identity/auth/auth.repository";
import { IIdentityRepository } from "@/domain/identity/identity.repository";
import { IAppConfig } from "@/shared/env/app.config";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { IEmailPort } from "@/shared/ports/email.port";
import { IRateLimit } from "@/shared/ports/rate-limit.port";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { InvalidResetTokenError } from "./password-reset.errors";
import {
	confirmPasswordResetProgram,
	requestPasswordResetProgram,
} from "./password-reset.programs";
import { IPasswordResetRepository } from "./password-reset.repository";

const mockUserId = "user-1" as TUserId;

const defaultAuthRepo = {
	findUserByEmail: vi.fn(() => Effect.succeed(null)),
	createUserWithBusiness: vi.fn(() =>
		Effect.succeed({ userId: mockUserId, businessId: "biz-1" as TTenantId }),
	),
	createSession: vi.fn(),
	findValidSessionByTokenHash: vi.fn(),
	touchSession: vi.fn(),
	deleteSessionByTokenHash: vi.fn(),
	deleteSessionsByUserId: vi.fn(() => Effect.void),
};

const defaultResetRepo = {
	create: vi.fn(() => Effect.void),
	findByTokenHash: vi.fn(() => Effect.succeed(null)),
	markAsUsed: vi.fn(() => Effect.void),
	invalidateActiveTokensForUser: vi.fn(() => Effect.void),
	consumeAndChangePassword: vi.fn(() =>
		Effect.fail(new InvalidResetTokenError({ message: "Token not found" })),
	),
};

const defaultIdentityRepo = {
	findProfileByUserId: vi.fn(),
	updateProfile: vi.fn(),
	updateEmail: vi.fn(),
	findBusinessById: vi.fn(),
	updateBusiness: vi.fn(),
	checkRole: vi.fn(),
	verifyCurrentPassword: vi.fn(),
	changePassword: vi.fn(() => Effect.void),
	verifyPin: vi.fn(),
	setPin: vi.fn(),
};

const defaultAppConfig = {
	publicBaseUrl: "https://app.example.com",
	database: { dbUrl: "" },
	email: {
		provider: "console" as const,
		apiKey: Redacted.make(""),
		from: "Pet Store <no-reply@example.com>",
	},
	kurir: {
		baseUrl: "https://api-kurir.treonstudio.workers.dev",
		apiKey: Redacted.make(""),
		productId: "",
	},
	ember: {
		baseUrl: "https://ember.treonstudio.com",
		apiKey: Redacted.make(""),
		bucket: "pet-store",
	},
	upstash: { redisUrl: "", redisToken: "" },
	mcp: { secretToken: "", businessId: "" },
	midtrans: { clientKey: "", serverKey: "", isProduction: false },
	anisAi: { apiKey: "", baseUrl: "https://api.anis.ai" },
	storage: { publicUrlBase: "" },
	session: { ttlMs: 1000 },
	environment: "test",
};

const defaultRateLimit = {
	check: vi.fn(() => Effect.succeed({ allowed: true, retryAfterSeconds: 0 })),
};

type MockRepo = Record<string, unknown>;

const makeLayer = (
	authRepo: MockRepo,
	resetRepo: MockRepo,
	identityRepo?: MockRepo,
	emailPort?: { sendEmail: ReturnType<typeof vi.fn> },
) => {
	const emailPort_ = emailPort ?? {
		sendEmail: vi.fn(() => Effect.void),
	};

	return Layer.mergeAll(
		Layer.succeed(IAuthRepository, IAuthRepository.of(authRepo as never)),
		Layer.succeed(
			IPasswordResetRepository,
			IPasswordResetRepository.of(resetRepo as never),
		),
		identityRepo
			? Layer.succeed(
					IIdentityRepository,
					IIdentityRepository.of(identityRepo as never),
				)
			: Layer.succeed(
					IIdentityRepository,
					IIdentityRepository.of(defaultIdentityRepo as never),
				),
		Layer.succeed(IEmailPort, IEmailPort.of(emailPort_ as never)),
		Layer.succeed(IRateLimit, IRateLimit.of(defaultRateLimit)),
		Layer.succeed(IAppConfig, defaultAppConfig),
	);
};

const runProgram = <A, E>(
	program: Effect.Effect<A, E, unknown>,
	layer: Layer.Layer<never>,
) =>
	runPromise(
		Effect.provide(program as never, layer as never) as never,
	) as Promise<A>;

const runProgramExit = <E>(
	program: Effect.Effect<unknown, E, unknown>,
	layer: Layer.Layer<never>,
) =>
	runPromiseExit(
		Effect.provide(program as never, layer as never) as never,
	) as Promise<Exit.Exit<unknown, E>>;

describe("requestPasswordResetProgram", () => {
	it("should not leak whether email exists", async () => {
		const authRepo = {
			...defaultAuthRepo,
			findUserByEmail: vi.fn(() => Effect.succeed(null)),
		};
		const resetRepo = { ...defaultResetRepo };
		const layer = makeLayer(authRepo, resetRepo);

		const result = await runProgram(
			requestPasswordResetProgram("nonexistent@example.com", {
				ip: "203.0.113.10",
			}),
			layer,
		);

		expect(result).toBeUndefined();
		expect(authRepo.findUserByEmail).toHaveBeenCalledWith(
			"nonexistent@example.com",
		);
	});

	it("should send email when user exists", async () => {
		const testUser: TAuthUser = {
			id: mockUserId,
			email: "user@example.com",
			passwordHash: "hash",
		};
		const authRepo = {
			...defaultAuthRepo,
			findUserByEmail: vi.fn(() => Effect.succeed(testUser)),
		};
		const resetRepo = {
			...defaultResetRepo,
			create: vi.fn(() => Effect.void),
			invalidateActiveTokensForUser: vi.fn(() => Effect.void),
		};
		const layer = makeLayer(authRepo, resetRepo);

		await runProgram(
			requestPasswordResetProgram("user@example.com", {
				ip: "203.0.113.10",
			}),
			layer,
		);

		expect(resetRepo.invalidateActiveTokensForUser).toHaveBeenCalledWith(
			mockUserId,
		);
		expect(resetRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: mockUserId,
			}),
		);
	});
});

describe("confirmPasswordResetProgram", () => {
	it("should reject weak password", async () => {
		const layer = makeLayer(defaultAuthRepo, defaultResetRepo);
		const exit = await runProgramExit(
			confirmPasswordResetProgram("some-token", "ab"),
			layer,
		);
		expect(exit._tag).toBe("Failure");
	});

	it("should reject invalid token format", async () => {
		const layer = makeLayer(defaultAuthRepo, defaultResetRepo);
		const exit = await runProgramExit(
			confirmPasswordResetProgram("not-hex", "valid-password-123"),
			layer,
		);
		expect(exit._tag).toBe("Failure");
	});

	it("should reject unknown token", async () => {
		const resetRepo = {
			...defaultResetRepo,
			consumeAndChangePassword: vi.fn(() =>
				Effect.fail(new InvalidResetTokenError({ message: "Token not found" })),
			),
		};
		const layer = makeLayer(defaultAuthRepo, resetRepo);
		const hexToken = "01".repeat(32);
		const exit = await runProgramExit(
			confirmPasswordResetProgram(hexToken, "valid-password-123"),
			layer,
		);
		expect(exit._tag).toBe("Failure");
	});

	it("should reject already-used token", async () => {
		const resetRepo = {
			...defaultResetRepo,
			consumeAndChangePassword: vi.fn(() =>
				Effect.fail(
					new InvalidResetTokenError({
						message: "Token has already been used",
					}),
				),
			),
		};
		const layer = makeLayer(defaultAuthRepo, resetRepo);
		const hexToken = "01".repeat(32);
		const exit = await runProgramExit(
			confirmPasswordResetProgram(hexToken, "valid-password-123"),
			layer,
		);
		expect(exit._tag).toBe("Failure");
	});

	it("should reject expired token", async () => {
		const resetRepo = {
			...defaultResetRepo,
			consumeAndChangePassword: vi.fn(() =>
				Effect.fail(
					new InvalidResetTokenError({ message: "Token has expired" }),
				),
			),
		};
		const layer = makeLayer(defaultAuthRepo, resetRepo);
		const hexToken = "01".repeat(32);
		const exit = await runProgramExit(
			confirmPasswordResetProgram(hexToken, "valid-password-123"),
			layer,
		);
		expect(exit._tag).toBe("Failure");
	});

	it("does not consume token when password update fails", async () => {
		const resetRepo = {
			...defaultResetRepo,
			consumeAndChangePassword: vi.fn(() =>
				Effect.fail(
					new DatabaseError({ cause: new Error("password update failed") }),
				),
			),
			markAsUsed: vi.fn(() => Effect.void),
		};
		const layer = makeLayer(defaultAuthRepo, resetRepo);

		const exit = await runProgramExit(
			confirmPasswordResetProgram("01".repeat(32), "valid-password-123"),
			layer,
		);

		expect(exit._tag).toBe("Failure");
		expect(resetRepo.markAsUsed).not.toHaveBeenCalled();
	});

	it("should succeed with valid token and revoke sessions", async () => {
		const resetRepo = {
			...defaultResetRepo,
			consumeAndChangePassword: vi.fn(() =>
				Effect.succeed({
					userId: mockUserId,
					email: "user@example.com",
				}),
			),
			markAsUsed: vi.fn(() => Effect.void),
		};
		const layer = makeLayer(defaultAuthRepo, resetRepo);

		const hexToken = "01".repeat(32);

		await runProgram(
			confirmPasswordResetProgram(hexToken, "valid-password-123"),
			layer,
		);

		expect(resetRepo.consumeAndChangePassword).toHaveBeenCalledWith({
			tokenHash: expect.any(String),
			newPassword: "valid-password-123",
			now: expect.any(String),
		});
		expect(resetRepo.markAsUsed).not.toHaveBeenCalled();
	});

	it("sends a password-changed confirmation email on successful reset", async () => {
		const emailPort = { sendEmail: vi.fn(() => Effect.void) };
		const resetRepo = {
			...defaultResetRepo,
			consumeAndChangePassword: vi.fn(() =>
				Effect.succeed({
					userId: "user-1" as TUserId,
					email: "user@example.com",
				}),
			),
		};
		const layer = makeLayer(defaultAuthRepo, resetRepo, undefined, emailPort);
		const validToken = "01".repeat(32);
		await runProgram(
			confirmPasswordResetProgram(validToken, "newSecurePassword123"),
			layer,
		);
		expect(emailPort.sendEmail).toHaveBeenCalledTimes(1);
		expect(emailPort.sendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "user@example.com",
				subject: expect.stringContaining("Password"),
			}),
		);
	});
});
