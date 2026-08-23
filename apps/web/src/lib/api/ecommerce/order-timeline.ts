import { getAuditLogsProgram } from "@/domain/audit/audit.programs";
import { getOrderProgram } from "@/domain/order/order.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

type TTimelineEvent = {
	readonly event: string;
	readonly at: string;
	readonly actor: string | null;
	readonly note: string | null;
};

export const handleGetOrderTimeline = async (
	request: Request,
	orderId: string,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
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
		const tenantId = validation.businessId as TTenantId;

		const order = await runApp(getOrderProgram(orderId, tenantId));
		if (!order) {
			return withRateLimitHeaders(
				new Response(
					JSON.stringify({
						success: false,
						error: `Order ${orderId} not found for this business.`,
					}),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		}

		const auditResult = await runApp(
			getAuditLogsProgram(tenantId, {
				entityType: "order",
				entityId: orderId,
				pageSize: 100,
			}),
		);

		const synthesized: TTimelineEvent[] = [];

		synthesized.push({
			event: "created",
			at: order.createdAt,
			actor: order.createdBy,
			note: `Order created with status "${order.status}"`,
		});

		if (order.voidedAt) {
			synthesized.push({
				event: "voided",
				at: order.voidedAt,
				actor: order.voidedBy,
				note: order.voidedReason ?? "Order voided",
			});
		}

		for (const log of auditResult.logs) {
			synthesized.push({
				event: log.action,
				at: log.createdAt,
				actor: log.userId,
				note: null,
			});
		}

		synthesized.sort((a, b) => a.at.localeCompare(b.at));

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: {
						orderId,
						currentStatus: order.status,
						events: synthesized,
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Order Timeline] Error:", error);
		return withRateLimitHeaders(
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
	}
};
