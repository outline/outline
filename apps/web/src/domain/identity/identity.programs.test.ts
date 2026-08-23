import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TUserId } from "@/shared/types/common.types";
import { changePasswordProgram, setPinProgram } from "./identity.programs";
import { IIdentityRepository } from "./identity.repository";
import type { ChangePasswordCommand, SetPinCommand } from "./identity.schemas";

describe("changePasswordProgram", () => {
	it("verifies currentPassword before calling changePassword", async () => {
		const verifyCurrentPassword = vi.fn().mockReturnValue(Effect.succeed(true));
		const changePassword = vi.fn().mockReturnValue(Effect.void);

		const TestLayer = Layer.succeed(IIdentityRepository, {
			findProfileByUserId: vi.fn(),
			updateProfile: vi.fn(),
			updateEmail: vi.fn(),
			findBusinessById: vi.fn(),
			updateBusiness: vi.fn(),
			checkRole: vi.fn(),
			findBranchesForUser: vi.fn(),
			hasPinSet: vi.fn(),
			verifyCurrentPassword,
			changePassword,
			verifyPin: vi.fn(),
			setPin: vi.fn(),
		});

		const command: ChangePasswordCommand = {
			currentPassword: "old-secret-42",
			password: "new-secret-42",
		};
		const userId = "user-123" as TUserId;

		const program = changePasswordProgram(command, userId);
		const result = await Effect.runPromise(Effect.provide(program, TestLayer));

		expect(result).toBeUndefined();
		expect(verifyCurrentPassword).toHaveBeenCalledWith(userId, "old-secret-42");
		expect(changePassword).toHaveBeenCalledWith(userId, "new-secret-42");
	});

	it("fails with WrongCurrentPasswordError when currentPassword is invalid", async () => {
		const verifyCurrentPassword = vi
			.fn()
			.mockReturnValue(Effect.succeed(false));
		const changePassword = vi.fn().mockReturnValue(Effect.void);

		const TestLayer = Layer.succeed(IIdentityRepository, {
			findProfileByUserId: vi.fn(),
			updateProfile: vi.fn(),
			updateEmail: vi.fn(),
			findBusinessById: vi.fn(),
			updateBusiness: vi.fn(),
			checkRole: vi.fn(),
			findBranchesForUser: vi.fn(),
			hasPinSet: vi.fn(),
			verifyCurrentPassword,
			changePassword,
			verifyPin: vi.fn(),
			setPin: vi.fn(),
		});

		const command: ChangePasswordCommand = {
			currentPassword: "wrong-password",
			password: "new-secret-42",
		};
		const userId = "user-123" as TUserId;

		const program = changePasswordProgram(command, userId);
		await expect(
			Effect.runPromise(Effect.provide(program, TestLayer)),
		).rejects.toThrow("Current password is incorrect");
		expect(changePassword).not.toHaveBeenCalled();
	});

	it("propagates DatabaseError when verifyCurrentPassword fails", async () => {
		const TestLayer = Layer.succeed(IIdentityRepository, {
			findProfileByUserId: vi.fn(),
			updateProfile: vi.fn(),
			updateEmail: vi.fn(),
			findBusinessById: vi.fn(),
			updateBusiness: vi.fn(),
			checkRole: vi.fn(),
			findBranchesForUser: vi.fn(),
			hasPinSet: vi.fn(),
			verifyCurrentPassword: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
			changePassword: vi.fn(),
			verifyPin: vi.fn(),
			setPin: vi.fn(),
		});

		const command: ChangePasswordCommand = {
			currentPassword: "old-secret-42",
			password: "new-secret-42",
		};
		const userId = "user-123" as TUserId;

		const program = changePasswordProgram(command, userId);
		await expect(
			Effect.runPromise(Effect.provide(program, TestLayer)),
		).rejects.toThrow("DatabaseError");
	});
});

describe("setPinProgram", () => {
	it("verifies currentPassword before calling setPin", async () => {
		const verifyCurrentPassword = vi.fn().mockReturnValue(Effect.succeed(true));
		const setPin = vi.fn().mockReturnValue(Effect.void);

		const TestLayer = Layer.succeed(IIdentityRepository, {
			findProfileByUserId: vi.fn(),
			updateProfile: vi.fn(),
			updateEmail: vi.fn(),
			findBusinessById: vi.fn(),
			updateBusiness: vi.fn(),
			checkRole: vi.fn(),
			findBranchesForUser: vi.fn(),
			hasPinSet: vi.fn(),
			verifyCurrentPassword,
			changePassword: vi.fn(),
			verifyPin: vi.fn(),
			setPin,
		});

		const command: SetPinCommand = {
			currentPassword: "old-secret-42",
			pin: "123456",
		};
		const userId = "user-123" as TUserId;

		const program = setPinProgram(command, userId);
		const result = await Effect.runPromise(Effect.provide(program, TestLayer));

		expect(result).toBeUndefined();
		expect(verifyCurrentPassword).toHaveBeenCalledWith(userId, "old-secret-42");
		expect(setPin).toHaveBeenCalledWith(userId, "123456");
	});

	it("fails with WrongCurrentPasswordError when currentPassword is invalid", async () => {
		const verifyCurrentPassword = vi
			.fn()
			.mockReturnValue(Effect.succeed(false));
		const setPin = vi.fn().mockReturnValue(Effect.void);

		const TestLayer = Layer.succeed(IIdentityRepository, {
			findProfileByUserId: vi.fn(),
			updateProfile: vi.fn(),
			updateEmail: vi.fn(),
			findBusinessById: vi.fn(),
			updateBusiness: vi.fn(),
			checkRole: vi.fn(),
			findBranchesForUser: vi.fn(),
			hasPinSet: vi.fn(),
			verifyCurrentPassword,
			changePassword: vi.fn(),
			verifyPin: vi.fn(),
			setPin,
		});

		const command: SetPinCommand = {
			currentPassword: "wrong-password",
			pin: "123456",
		};
		const userId = "user-123" as TUserId;

		const program = setPinProgram(command, userId);
		await expect(
			Effect.runPromise(Effect.provide(program, TestLayer)),
		).rejects.toThrow("Current password is incorrect");
		expect(setPin).not.toHaveBeenCalled();
	});
});
