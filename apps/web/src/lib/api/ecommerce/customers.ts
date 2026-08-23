import {
	getCustomerByIdProgram,
	getCustomersProgram,
} from "@/domain/customer/customer.programs";
import { getCustomerOrderHistoryProgram } from "@/domain/order/order.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const forbidden = (): Response =>
	withRateLimitHeaders(
		new Response(
			JSON.stringify({
				success: false,
				error: "Forbidden: API key missing required scope 'customers:read'",
			}),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		),
	);

const notFound = (id: string): Response =>
	withRateLimitHeaders(
		new Response(
			JSON.stringify({
				success: false,
				error: `Customer ${id} not found for this business.`,
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

const sanitize = (c: {
	id: string;
	businessId: string;
	userId: string | null;
	fullName: string;
	phone: string;
	email: string | null;
	address: string | null;
	notes: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}) => ({
	id: c.id,
	fullName: c.fullName,
	phone: c.phone,
	email: c.email,
	address: c.address,
	notes: c.notes,
	isActive: c.isActive,
	createdAt: c.createdAt.toISOString(),
	updatedAt: c.updatedAt.toISOString(),
});

export const handleGetCustomers = async (
	request: Request,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();
	if (!checkScope(validation, "customers:read")) return forbidden();

	const url = new URL(request.url);
	const search = url.searchParams.get("search") ?? undefined;

	try {
		const customers = await runApp(
			getCustomersProgram(validation.businessId as TTenantId, search),
		);

		const sanitized = customers.map(sanitize);
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
		console.error("[API v1 List Customers] Error:", error);
		return internalError();
	}
};

export const handleGetCustomer = async (
	request: Request,
	customerId: string,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();
	if (!checkScope(validation, "customers:read")) return forbidden();

	if (!UUID_PATTERN.test(customerId)) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Bad Request: customerId must be a UUID.",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const customer = await runApp(
			getCustomerByIdProgram(validation.businessId as TTenantId, customerId),
		);
		if (!customer) return notFound(customerId);

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({ success: true, data: sanitize(customer) }),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Get Customer] Error:", error);
		return internalError();
	}
};

export const handleGetCustomerOrders = async (
	request: Request,
	customerId: string,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();
	if (!checkScope(validation, "customers:read")) return forbidden();

	if (!UUID_PATTERN.test(customerId)) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Bad Request: customerId must be a UUID.",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	const url = new URL(request.url);
	const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
	const limit = Math.min(
		Math.max(
			Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20,
			1,
		),
		100,
	);
	const offset = Math.max(
		Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
		0,
	);

	try {
		const customer = await runApp(
			getCustomerByIdProgram(validation.businessId as TTenantId, customerId),
		);
		if (!customer) return notFound(customerId);

		const { orders, total } = await runApp(
			getCustomerOrderHistoryProgram(
				customerId,
				validation.businessId as TTenantId,
				{ limit, offset },
			),
		);

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: {
						customer: sanitize(customer),
						orders,
						meta: {
							total,
							limit,
							offset,
							hasMore: offset + orders.length < total,
						},
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Customer Orders] Error:", error);
		return internalError();
	}
};
