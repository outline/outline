import { UpdateOrderStatusSchema } from "@treonstudio/petso-lib/schemas";
import { Schema } from "effect";
import {
	getOrderProgram,
	updateOrderStatus,
} from "@/domain/order/order.programs";
import {
	MissingCancelledReasonError,
	MissingTrackingInfoError,
} from "@/domain/order/order.errors";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";
import type { TOrderId, TOrderTracking } from "@/domain/order/order.types";

const UpdateStatusSchema = UpdateOrderStatusSchema;

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

const notFound = (id: string): Response =>
	withRateLimitHeaders(
		new Response(
			JSON.stringify({
				success: false,
				error: `Order ${id} not found for this business.`,
			}),
			{
				status: 404,
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

export const handleGetOrder = async (
	request: Request,
	orderId: string,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();
	if (!checkScope(validation, "orders:read")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'orders:read'",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const order = await runApp(
			getOrderProgram(orderId, validation.businessId as TTenantId),
		);

		if (!order) return notFound(orderId);

		return withRateLimitHeaders(
			new Response(JSON.stringify({ success: true, data: order }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
	} catch (error) {
		console.error("[API v1 Get Order] Error:", error);
		return internalError();
	}
};

export const handlePatchOrder = async (
	request: Request,
	orderId: string,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();
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

	let command: Schema.Schema.Type<typeof UpdateStatusSchema>;
	try {
		command = Schema.decodeUnknownSync(UpdateStatusSchema)(body);
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

	if (command.status === "draft") {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error:
						"Bad Request: Cannot update order to 'draft' status via PATCH. Use confirmed, processing, shipped, delivered, or cancelled.",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	const tracking: TOrderTracking = {
		...(command.trackingNumber !== undefined && {
			trackingNumber: command.trackingNumber,
		}),
		...(command.shippingCarrier !== undefined && {
			shippingCarrier: command.shippingCarrier,
		}),
		...(command.cancelledReason !== undefined && {
			cancelledReason: command.cancelledReason,
		}),
	};
	const trackingArg = Object.keys(tracking).length > 0 ? tracking : undefined;

	try {
		const updated = await runApp(
			updateOrderStatus(
				orderId as TOrderId,
				validation.businessId as TTenantId,
				command.status,
				trackingArg,
			),
		);

		return withRateLimitHeaders(
			new Response(JSON.stringify({ success: true, data: updated }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
	} catch (error) {
		const errorObj = error as { _tag?: string; id?: string };
		if (errorObj?._tag === "OrderNotFoundError") {
			return notFound(orderId);
		}
		if (errorObj?._tag === "MissingTrackingInfoError") {
			return withRateLimitHeaders(
				new Response(
					JSON.stringify({
						success: false,
						error:
							"Bad Request: Tracking number and shipping carrier are required when status is 'shipped'.",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		}
		if (errorObj?._tag === "MissingCancelledReasonError") {
			return withRateLimitHeaders(
				new Response(
					JSON.stringify({
						success: false,
						error:
							"Bad Request: Cancelled reason is required when status is 'cancelled'.",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		}
		console.error("[API v1 Patch Order] Error:", error);
		return internalError();
	}
};
