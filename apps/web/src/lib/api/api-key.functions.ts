import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
	createApiKeyProgram,
	listApiKeysProgram,
	revokeApiKeyProgram,
	updateApiKeyProgram,
} from "@/domain/identity/api-key/api-key.programs";
import {
	CreateApiKeySchema,
	UpdateApiKeySchema,
} from "@/domain/identity/api-key/api-key.schemas";
import type { TApiKeyId } from "@/domain/identity/api-key/api-key.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TUserId } from "@/shared/types/common.types";
import { logAuditEvent } from "./audit.functions";

export const listApiKeys = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "settings:manage"));
		return await runApp(listApiKeysProgram(tenantId));
	});

export const createApiKey = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateApiKeySchema))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "settings:manage"));
		const result = await runApp(
			createApiKeyProgram(
				tenantId,
				data.name,
				data.scopes,
				userId as TUserId,
				data.expiresAt ?? null,
			),
		);
		logAuditEvent(
			tenantId,
			userId as TUserId,
			"api_key_create",
			"api_key",
			result.apiKey.id,
		).catch(() => {});
		return result;
	});

export const updateApiKey = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateApiKeySchema))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "settings:manage"));
		const result = await runApp(
			updateApiKeyProgram(tenantId, data.id as TApiKeyId, data),
		);
		logAuditEvent(
			tenantId,
			userId as TUserId,
			"api_key_update",
			"api_key",
			data.id,
		).catch(() => {});
		return result;
	});

export const revokeApiKey = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.Struct({ id: Schema.String })))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "settings:manage"));
		await runApp(revokeApiKeyProgram(tenantId, data.id as TApiKeyId));
		logAuditEvent(
			tenantId,
			userId as TUserId,
			"api_key_revoke",
			"api_key",
			data.id,
		).catch(() => {});
		return { success: true };
	});
