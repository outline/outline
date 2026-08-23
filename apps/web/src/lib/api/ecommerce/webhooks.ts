import { Schema } from "effect";
import {
	createWebhookProgram,
	listWebhooksProgram,
	revokeWebhookProgram,
} from "@/domain/webhook/webhook.programs";
import { CreateWebhookEndpointSchema } from "@/domain/webhook/webhook.schemas";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

const unauthorized = (): Response =>
	withRateLimitHeaders(
		new Response(
			JSON.stringify({
				success: false,
				error: "Unauthorized: Invalid or missing API key.",
			}),
			{
				status: 401,
				headers: { "Content-Type": "application/json" },
			},
		),
	);

const internalError = (): Response =>
	withRateLimitHeaders(
		new Response(
			JSON.stringify({
				success: false,
				error: "Internal Server Error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		),
	);

export const handleGetWebhooks = async (
	request: Request,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();

	if (!checkScope(validation, "webhooks:read")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'webhooks:read'",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const endpoints = await runApp(
			listWebhooksProgram(validation.businessId as TTenantId),
		);

		const sanitized = endpoints.map((e) => ({
			id: e.id,
			url: e.url,
			events: e.events,
			isActive: e.isActive,
			description: e.description,
			lastTriggeredAt: e.lastTriggeredAt
				? e.lastTriggeredAt.toISOString()
				: null,
			lastTriggerStatus: e.lastTriggerStatus,
			createdAt: e.createdAt.toISOString(),
			revokedAt: e.revokedAt ? e.revokedAt.toISOString() : null,
		}));

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: sanitized,
					meta: { total: sanitized.length },
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 List Webhooks] Error:", error);
		return internalError();
	}
};

export const handlePostWebhook = async (
	request: Request,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();

	if (!checkScope(validation, "webhooks:write")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'webhooks:write'",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Bad Request: Body must be valid JSON.",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	let command: Schema.Schema.Type<typeof CreateWebhookEndpointSchema>;
	try {
		command = Schema.decodeUnknownSync(CreateWebhookEndpointSchema)(body);
	} catch (err) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Bad Request: Schema validation failed.",
					details: err instanceof Error ? err.message : String(err),
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const { endpoint, secret } = await runApp(
			createWebhookProgram(validation.businessId as TTenantId, command),
		);

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: {
						id: endpoint.id,
						url: endpoint.url,
						events: endpoint.events,
						isActive: endpoint.isActive,
						description: endpoint.description,
						createdAt: endpoint.createdAt.toISOString(),
						secret,
						secretNotice:
							"Save this secret now. It will not be shown again. Use it to verify X-Webhook-Signature header (HMAC-SHA256).",
					},
				}),
				{
					status: 201,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Create Webhook] Error:", error);
		return internalError();
	}
};

export const handleDeleteWebhook = async (
	request: Request,
	webhookId: string,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();

	if (!checkScope(validation, "webhooks:write")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'webhooks:write'",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const revoked = await runApp(
			revokeWebhookProgram(webhookId, validation.businessId as TTenantId),
		);

		if (!revoked) {
			return withRateLimitHeaders(
				new Response(
					JSON.stringify({
						success: false,
						error: `Webhook ${webhookId} not found.`,
					}),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		}

		return withRateLimitHeaders(
			new Response(JSON.stringify({ success: true, data: { revoked: true } }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
	} catch (error) {
		console.error("[API v1 Delete Webhook] Error:", error);
		return internalError();
	}
};
