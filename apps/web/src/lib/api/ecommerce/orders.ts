import { eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { createOrderProgram } from "@/domain/order/order.programs";
import {
	type CreateOrderCommand,
	CreateOrderSchema,
} from "@/domain/order/order.schemas";
import {
	checkScope,
	getIdempotentResponse,
	saveIdempotentResponse,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { profiles } from "@/infra/db/drizzle/schema";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const handlePostOrders = async (request: Request): Promise<Response> => {
	const authHeader = request.headers.get("Authorization");
	const validation = await validateApiKey(authHeader);

	if (!validation) {
		return withRateLimitHeaders(
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
	}

	if (!checkScope(validation, "orders:write")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'orders:write'",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	// Read the body exactly once — a Request's body stream can only be
	// consumed a single time. Both the idempotency check below and the
	// idempotency save further down reuse this same raw string instead of
	// each calling request.clone().text()/request.json() independently,
	// which previously threw "This ReadableStream is currently locked to a
	// reader" once the stream had already been read once.
	const idempotencyKey = request.headers.get("Idempotency-Key");
	const rawBody = await request.text();

	if (idempotencyKey) {
		const cached = await getIdempotentResponse(
			validation.businessId,
			idempotencyKey,
			rawBody,
		);
		if (cached) {
			return withRateLimitHeaders(cached);
		}
	}

	try {
		const body = JSON.parse(rawBody);
		let command: CreateOrderCommand;
		try {
			command = Schema.decodeUnknownSync(CreateOrderSchema)(body);
		} catch (validationErr) {
			return withRateLimitHeaders(
				new Response(
					JSON.stringify({
						success: false,
						error: "Bad Request: Schema validation failed.",
						details:
							validationErr instanceof Error
								? validationErr.message
								: String(validationErr),
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		}

		const systemUserId = await runApp(
			Effect.gen(function* () {
				const db = yield* IDrizzleClient;
				const [profile] = yield* Effect.tryPromise({
					try: () =>
						db
							.select()
							.from(profiles)
							.where(eq(profiles.businessId, validation.businessId))
							.limit(1),
					catch: (e) => e,
				});
				return profile?.userId ?? null;
			}),
		);

		if (!systemUserId) {
			return withRateLimitHeaders(
				new Response(
					JSON.stringify({
						success: false,
						error: "Failed to resolve a valid system user for this business.",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		}

		const orderDto = await runApp(
			createOrderProgram(
				command,
				validation.businessId as TTenantId,
				systemUserId as TUserId,
			),
		);

		const responseBody = {
			success: true,
			data: orderDto,
		};

		try {
			const { dispatchWebhook } = await import(
				"@/domain/webhook/webhook.dispatcher"
			);
			const { IWebhookRepository } = await import(
				"@/domain/webhook/webhook.repository"
			);
			const webhookRepo = await runApp(IWebhookRepository);
			await dispatchWebhook(
				webhookRepo,
				validation.businessId,
				"order.created",
				{
					orderId: orderDto.id,
					totalAmount: orderDto.totalAmount,
					paymentMethod: orderDto.paymentMethod,
					status: orderDto.status,
					customerId: orderDto.customerId,
					items: orderDto.items,
				},
			);
		} catch (webhookErr) {
			console.error("[Webhook Dispatch] Failed:", webhookErr);
		}

		if (idempotencyKey) {
			await saveIdempotentResponse(
				validation.businessId,
				idempotencyKey,
				rawBody,
				responseBody,
				201,
			);
		}

		return withRateLimitHeaders(
			new Response(JSON.stringify(responseBody), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			}),
		);
	} catch (error) {
		console.error("[API v1 Orders Ingestion] Error:", error);
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error:
						error instanceof Error ? error.message : "Internal Server Error",
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}
};
