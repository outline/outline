import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
	confirmPasswordResetProgram,
	requestPasswordResetProgram,
} from "@/domain/identity/password-reset/password-reset.programs";
import { normalizeEmail } from "@/infra/auth/email";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { logAuditEvent } from "./audit.functions";

const RequestResetSchema = Schema.Struct({
	email: Schema.String,
});

const ConfirmResetSchema = Schema.Struct({
	token: Schema.String,
	newPassword: Schema.String,
});

const getRequestIp = async (): Promise<string> => {
	try {
		const mod = "vinxi/http";
		const { getEvent } = await import(/* @vite-ignore */ mod);
		const event = getEvent() as Record<string, unknown>;
		const headers = (event?.headers ?? event?.node) as
			| Headers
			| { readonly req?: { readonly headers?: Record<string, unknown> } }
			| undefined;

		if (headers instanceof Headers) {
			return (
				headers.get("cf-connecting-ip") ??
				headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
				"unknown"
			);
		}

		const nodeHeaders =
			headers && "req" in headers ? headers.req?.headers : undefined;
		const cfIp = nodeHeaders?.["cf-connecting-ip"];
		if (typeof cfIp === "string") return cfIp;
		const forwarded = nodeHeaders?.["x-forwarded-for"];
		if (typeof forwarded === "string") {
			return forwarded.split(",")[0]?.trim() || "unknown";
		}
	} catch {}

	return "unknown";
};

export const requestPasswordReset = createServerFn({ method: "POST" })
	.validator(Schema.decodeUnknownSync(RequestResetSchema))
	.handler(async ({ data }) => {
		try {
			await runApp(
				requestPasswordResetProgram(normalizeEmail(data.email), {
					ip: await getRequestIp(),
				}),
			);
		} finally {
			logAuditEvent(
				"" as TTenantId,
				"" as TUserId,
				"password_reset_request",
				"user",
			).catch(() => {});
		}
		return { success: true };
	});

export const confirmPasswordReset = createServerFn({ method: "POST" })
	.validator(Schema.decodeUnknownSync(ConfirmResetSchema))
	.handler(async ({ data }) => {
		try {
			await runApp(confirmPasswordResetProgram(data.token, data.newPassword));
		} finally {
			logAuditEvent(
				"" as TTenantId,
				"" as TUserId,
				"password_reset_confirm",
				"user",
			).catch(() => {});
		}
		return { success: true };
	});
