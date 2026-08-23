import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { type TProfileDto, toProfileDto } from "./identity.dto";
import {
	BusinessNotFoundError,
	ProfileNotFoundError,
	UnauthorizedError,
	WrongCurrentPasswordError,
} from "./identity.errors";
import { IIdentityRepository } from "./identity.repository";
import type {
	ChangePasswordCommand,
	SetPinCommand,
	UpdateBusinessCommand,
	UpdateEmailCommand,
	UpdateProfileCommand,
	VerifyPinCommand,
} from "./identity.schemas";

export const getProfileProgram = (
	userId: TUserId,
): Effect.Effect<
	TProfileDto,
	DatabaseError | ProfileNotFoundError,
	IIdentityRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IIdentityRepository;
		const profile = yield* repo.findProfileByUserId(userId);
		if (!profile) yield* Effect.fail(new ProfileNotFoundError({ userId }));
		return toProfileDto(profile as import("./identity.types").TProfile);
	});

export const getBusinessIdProgram = (
	userId: TUserId,
): Effect.Effect<TTenantId | null, DatabaseError, IIdentityRepository> =>
	Effect.gen(function* () {
		const repo = yield* IIdentityRepository;
		const profile = yield* repo.findProfileByUserId(userId);
		return profile ? (profile.businessId as TTenantId) : null;
	});

export const getRawProfileProgram = (
	userId: TUserId,
): Effect.Effect<
	import("./identity.types").TProfile | null,
	DatabaseError,
	IIdentityRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IIdentityRepository;
		return yield* repo.findProfileByUserId(userId);
	});

export const updateProfileProgram = (
	command: UpdateProfileCommand,
	userId: TUserId,
): Effect.Effect<void, DatabaseError, IIdentityRepository> =>
	Effect.gen(function* () {
		const repo = yield* IIdentityRepository;
		yield* repo.updateProfile(userId, {
			fullName: command.fullName,
			...(command.phoneNumber !== undefined
				? { phoneNumber: command.phoneNumber }
				: {}),
		});
	});

export const updateEmailProgram = (
	command: UpdateEmailCommand,
	userId: TUserId,
): Effect.Effect<void, DatabaseError, IIdentityRepository> =>
	Effect.gen(function* () {
		const repo = yield* IIdentityRepository;
		yield* repo.updateEmail(userId, command.email);
	});

export const updateBusinessProgram = (
	command: UpdateBusinessCommand,
	userId: TUserId,
): Effect.Effect<
	void,
	DatabaseError | BusinessNotFoundError | UnauthorizedError,
	IIdentityRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IIdentityRepository;
		const businessId = command.businessId as TTenantId;

		const isAdmin = yield* repo.checkRole(
			userId,
			businessId,
			"admin" as unknown as "owner",
		); // admin is the actual DB role
		if (!isAdmin) {
			yield* Effect.fail(
				new UnauthorizedError({ message: "Admin access required" }),
			);
		}

		const business = yield* repo.findBusinessById(businessId);
		if (!business)
			yield* Effect.fail(new BusinessNotFoundError({ id: businessId }));

		yield* repo.updateBusiness(businessId, {
			...(command.name && { name: command.name }),
			...(command.logoUrl && { logo_url: command.logoUrl }),
			...(command.signatureUrl && { signature_url: command.signatureUrl }),
		});
	});

export const changePasswordProgram = (
	command: ChangePasswordCommand,
	userId: TUserId,
): Effect.Effect<
	void,
	DatabaseError | WrongCurrentPasswordError,
	IIdentityRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IIdentityRepository;

		// SECURITY: re-authenticate with the current password before
		// allowing the change. Without this, a hijacked session
		// (XSS, stolen cookie) can permanently lock the user out
		// by changing their password + triggering an email reset.
		const verified = yield* repo.verifyCurrentPassword(
			userId,
			command.currentPassword,
		);
		if (!verified) {
			return yield* Effect.fail(
				new WrongCurrentPasswordError({
					message: "Current password is incorrect",
				}),
			);
		}

		yield* repo.changePassword(userId, command.password);
	});

export const verifyPinProgram = (
	command: VerifyPinCommand,
	userId: TUserId,
): Effect.Effect<boolean, DatabaseError, IIdentityRepository> =>
	Effect.gen(function* () {
		const repo = yield* IIdentityRepository;
		return yield* repo.verifyPin(userId, command.pin);
	});

export const setPinProgram = (
	command: SetPinCommand,
	userId: TUserId,
): Effect.Effect<
	void,
	DatabaseError | WrongCurrentPasswordError,
	IIdentityRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IIdentityRepository;

		// SECURITY: require the current password before letting a session set
		// or change the PIN — the PIN is a shortcut past the idle lock, so
		// setting it needs the same re-auth guard as changePassword.
		const verified = yield* repo.verifyCurrentPassword(
			userId,
			command.currentPassword,
		);
		if (!verified) {
			return yield* Effect.fail(
				new WrongCurrentPasswordError({
					message: "Current password is incorrect",
				}),
			);
		}

		yield* repo.setPin(userId, command.pin);
	});
