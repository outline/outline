import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
	ChangePasswordSchema,
	changePasswordProgram,
	getProfileProgram,
	SetPinSchema,
	setPinProgram,
	UpdateBusinessSchema,
	UpdateEmailSchema,
	UpdateProfileSchema,
	updateBusinessProgram,
	updateEmailProgram,
	updateProfileProgram,
	VerifyPinSchema,
	verifyPinProgram,
} from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TUserId } from "@/shared/types/common.types";

export const updateProfile = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateProfileSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		await runApp(requireCapability(context, "profile:write"));
		await runApp(updateProfileProgram(data, userId as TUserId));
		return { success: true };
	});

export const updateEmail = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateEmailSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		await runApp(requireCapability(context, "profile:write"));
		await runApp(updateEmailProgram(data, userId as TUserId));
		return { success: true };
	});

export const updateBusiness = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateBusinessSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		await runApp(requireCapability(context, "profile:write"));
		await runApp(updateBusinessProgram(data, userId as TUserId));
		return { success: true };
	});

export const changePassword = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(ChangePasswordSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		await runApp(requireCapability(context, "profile:write"));
		await runApp(changePasswordProgram(data, userId as TUserId));
		return { success: true };
	});

export const getProfile = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		return await runApp(getProfileProgram(userId as TUserId));
	});

export const verifyPin = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(VerifyPinSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		await runApp(requireCapability(context, "profile:write"));
		await runApp(verifyPinProgram(data, userId as TUserId));
		return { success: true };
	});

export const setPin = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(SetPinSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		await runApp(requireCapability(context, "profile:write"));
		await runApp(setPinProgram(data, userId as TUserId));
		return { success: true };
	});
