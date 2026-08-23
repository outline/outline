import { listOrdersProgram } from "@/domain/order/order.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

const parseLimit = (raw: string | null): number => {
	if (!raw) return DEFAULT_LIMIT;
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
	return Math.min(n, MAX_LIMIT);
};

const parseOffset = (raw: string | null): number => {
	if (!raw) return 0;
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n < 0) return 0;
	return n;
};

const parseStatus = (
	raw: string | null,
):
	| "draft"
	| "confirmed"
	| "processing"
	| "shipped"
	| "delivered"
	| "cancelled"
	| "voided"
	| undefined => {
	if (
		raw === "draft" ||
		raw === "confirmed" ||
		raw === "processing" ||
		raw === "shipped" ||
		raw === "delivered" ||
		raw === "cancelled" ||
		raw === "voided"
	)
		return raw;
	return undefined;
};

const parseDate = (raw: string | null): Date | undefined => {
	if (!raw) return undefined;
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? undefined : d;
};

const parsePhone = (raw: string | null): string | undefined => {
	if (!raw) return undefined;
	const stripped = raw.replace(/\D/g, "");
	return stripped.length > 0 ? stripped : undefined;
};

export const handleGetOrders = async (request: Request): Promise<Response> => {
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

	const url = new URL(request.url);
	const limit = parseLimit(url.searchParams.get("limit"));
	const offset = parseOffset(url.searchParams.get("offset"));
	const status = parseStatus(url.searchParams.get("status"));
	const fromDate = parseDate(url.searchParams.get("from"));
	const toDate = parseDate(url.searchParams.get("to"));
	const phone = parsePhone(url.searchParams.get("phone"));

	if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Bad Request: 'from' must be earlier than or equal to 'to'.",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const { orders, total } = await runApp(
			listOrdersProgram(validation.businessId as TTenantId, {
				limit,
				offset,
				...(status !== undefined && { status }),
				...(fromDate !== undefined && { fromDate }),
				...(toDate !== undefined && { toDate }),
				...(phone !== undefined && { phone }),
			}),
		);

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: orders,
					meta: {
						total,
						limit,
						offset,
						hasMore: offset + orders.length < total,
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Orders List] Error:", error);
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
