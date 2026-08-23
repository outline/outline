import { generateRequestId, logOperation } from "@/shared/observability";
import { bindWorkerEnv } from "@/shared/env/app.config";
import { consumeLastCapturedError, renderErrorPage } from "@/shared/utils";
import { handleRestRequest } from "./lib/api/http/rest-app";

type ServerEntry = {
	fetch: (
		request: Request,
		env: unknown,
		ctx: unknown,
	) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
	if (!serverEntryPromise) {
		serverEntryPromise = import("@tanstack/react-start/server-entry").then(
			(m) => (m.default ?? m) as ServerEntry,
		);
	}
	return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(
	response: Response,
	requestId: string,
): Promise<Response> {
	if (response.status < 500) return response;
	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("application/json")) return response;

	const body = await response.clone().text();
	if (
		!body.includes('"unhandled":true') ||
		!body.includes('"message":"HTTPError"')
	) {
		return response;
	}

	const error =
		consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
	const errorObj = error as { message?: string };
	logOperation(
		{ requestId, tenantId: null, actorId: null, ipAddress: null },
		"ssr",
		"failure",
		0,
		"h3_swallowed_error",
		errorObj.message ?? body,
	);
	return new Response(renderErrorPage(error), {
		status: 500,
		headers: { "content-type": "text/html; charset=utf-8" },
	});
}

const withRequestId = (request: Request): string => {
	const existing = request.headers.get("X-Request-Id");
	if (existing) return existing;
	const rid = generateRequestId();
	return rid;
};

export default {
	async fetch(request: Request, env: unknown, ctx: unknown) {
		bindWorkerEnv(env);
		const requestId = withRequestId(request);
		const start = performance.now();

		try {
			const url = new URL(request.url);
			const restResponse = await handleRestRequest(request);
			if (restResponse) {
				return restResponse;
			}

			if (url.pathname === "/api/v1/seed-ember" && request.method === "POST") {
				const { handleSeedEmber } = await import("./lib/api/ecommerce/seed-ember");
				const res = await handleSeedEmber(request, env);
				res.headers.set("X-Request-Id", requestId);
				return res;
			}

			if (url.pathname === "/api/pdf") {
				const { generatePdfResponse } = await import("./lib/pdfGenerator");
				const res = await generatePdfResponse(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"pdf",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/midtrans-webhook") {
				const { handleMidtransWebhook } = await import(
					"./lib/api/midtrans-webhook"
				);
				const res = await handleMidtransWebhook(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"midtrans-webhook",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/mcp" && request.method === "POST") {
				const { handlePostMcp } = await import("./lib/api/mcp");
				const res = await handlePostMcp(request, env);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"mcp",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/v1/products" && request.method === "GET") {
				const { handleGetProducts } = await import(
					"./lib/api/ecommerce/products"
				);
				const res = await handleGetProducts(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-products",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/v1/categories" && request.method === "GET") {
				const { handleGetCategories } = await import(
					"./lib/api/ecommerce/categories"
				);
				const res = await handleGetCategories(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-categories",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/v1/orders" && request.method === "GET") {
				const { handleGetOrders } = await import(
					"./lib/api/ecommerce/orders-list"
				);
				const res = await handleGetOrders(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-orders-list",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/v1/orders" && request.method === "POST") {
				const { handlePostOrders } = await import("./lib/api/ecommerce/orders");
				const res = await handlePostOrders(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-orders",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			const orderDetailMatch = url.pathname.match(
				/^\/api\/v1\/orders\/([0-9a-f-]{36})$/i,
			);
			if (orderDetailMatch) {
				const orderId = orderDetailMatch[1] as string;
				const res =
					request.method === "GET"
						? await (
								await import("./lib/api/ecommerce/order-detail")
							).handleGetOrder(request, orderId)
						: request.method === "PATCH"
							? await (
									await import("./lib/api/ecommerce/order-detail")
								).handlePatchOrder(request, orderId)
							: new Response(
									JSON.stringify({
										success: false,
										error: "Method Not Allowed",
									}),
									{
										status: 405,
										headers: {
											"Content-Type": "application/json",
											Allow: "GET, PATCH",
										},
									},
								);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-order-detail",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (
				(url.pathname === "/api/v1/featured" || url.pathname === "/api/v1/products/featured") &&
				request.method === "GET"
			) {
				const { handleGetFeatured } = await import(
					"./lib/api/ecommerce/featured"
				);
				const res = await handleGetFeatured(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-featured",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			const productDetailMatch = url.pathname.match(
				/^\/api\/v1\/products\/([0-9a-f-]{36})$/i,
			);
			if (productDetailMatch && request.method === "GET") {
				const productId = productDetailMatch[1] as string;
				const { handleGetProduct } = await import(
					"./lib/api/ecommerce/product-detail"
				);
				const res = await handleGetProduct(request, productId);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-product-detail",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			const branchDetailMatch = url.pathname.match(
				/^\/api\/v1\/branches\/([0-9a-f-]{36})$/i,
			);
			if (branchDetailMatch && request.method === "GET") {
				const branchId = branchDetailMatch[1] as string;
				const { handleGetBranch } = await import(
					"./lib/api/ecommerce/branch-detail"
				);
				const res = await handleGetBranch(request, branchId);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-branch-detail",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/v1/services" && request.method === "GET") {
				const { handleGetServices } = await import(
					"./lib/api/ecommerce/services"
				);
				const res = await handleGetServices(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-services",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/v1/vouchers" && request.method === "GET") {
				const { handleGetVouchers } = await import(
					"./lib/api/ecommerce/vouchers"
				);
				const res = await handleGetVouchers(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-vouchers",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (
				url.pathname === "/api/v1/vouchers/validate" &&
				request.method === "POST"
			) {
				const { handlePostValidateVoucher } = await import(
					"./lib/api/ecommerce/vouchers"
				);
				const res = await handlePostValidateVoucher(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-vouchers-validate",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			const orderTimelineMatch = url.pathname.match(
				/^\/api\/v1\/orders\/([0-9a-f-]{36})\/timeline$/i,
			);
			if (orderTimelineMatch && request.method === "GET") {
				const orderId = orderTimelineMatch[1] as string;
				const { handleGetOrderTimeline } = await import(
					"./lib/api/ecommerce/order-timeline"
				);
				const res = await handleGetOrderTimeline(request, orderId);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-order-timeline",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (
				url.pathname === "/api/v1/dashboard/summary" &&
				request.method === "GET"
			) {
				const { handleGetDashboardSummary } = await import(
					"./lib/api/ecommerce/dashboard-summary"
				);
				const res = await handleGetDashboardSummary(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-dashboard-summary",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (
				url.pathname === "/api/v1/products/suggest" &&
				request.method === "GET"
			) {
				const { handleGetProductSuggestions } = await import(
					"./lib/api/ecommerce/product-suggest"
				);
				const res = await handleGetProductSuggestions(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-product-suggest",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/v1/webhooks") {
				const res =
					request.method === "GET"
						? await (
								await import("./lib/api/ecommerce/webhooks")
							).handleGetWebhooks(request)
						: request.method === "POST"
							? await (
									await import("./lib/api/ecommerce/webhooks")
								).handlePostWebhook(request)
							: new Response(
									JSON.stringify({
										success: false,
										error: "Method Not Allowed",
									}),
									{
										status: 405,
										headers: {
											"Content-Type": "application/json",
											Allow: "GET, POST",
										},
									},
								);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-webhooks",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			const webhookDetailMatch = url.pathname.match(
				/^\/api\/v1\/webhooks\/([0-9a-f-]{36})$/i,
			);
			if (webhookDetailMatch && request.method === "DELETE") {
				const webhookId = webhookDetailMatch[1] as string;
				const { handleDeleteWebhook } = await import(
					"./lib/api/ecommerce/webhooks"
				);
				const res = await handleDeleteWebhook(request, webhookId);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-webhook-delete",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/v1/seed" && request.method === "POST") {
				const { handlePostSeed } = await import("./lib/api/ecommerce/seed");
				const res = await handlePostSeed(request, env);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-seed",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname === "/api/v1/seed-ember" && request.method === "POST") {
				const { handleSeedEmber } = await import("./lib/api/ecommerce/seed-ember");
				const res = await handleSeedEmber(request, env);
				res.headers.set("X-Request-Id", requestId);
				return res;
			}

			if (url.pathname === "/api/v1/customers" && request.method === "GET") {
				const { handleGetCustomers } = await import(
					"./lib/api/ecommerce/customers"
				);
				const res = await handleGetCustomers(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-customers",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			const customerOrdersMatch = url.pathname.match(
				/^\/api\/v1\/customers\/([0-9a-f-]{36})\/orders$/i,
			);
			if (customerOrdersMatch && request.method === "GET") {
				const customerId = customerOrdersMatch[1] as string;
				const { handleGetCustomerOrders } = await import(
					"./lib/api/ecommerce/customers"
				);
				const res = await handleGetCustomerOrders(request, customerId);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-customer-orders",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			const customerDetailMatch = url.pathname.match(
				/^\/api\/v1\/customers\/([0-9a-f-]{36})$/i,
			);
			if (customerDetailMatch && request.method === "GET") {
				const customerId = customerDetailMatch[1] as string;
				const { handleGetCustomer } = await import(
					"./lib/api/ecommerce/customers"
				);
				const res = await handleGetCustomer(request, customerId);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-customer-detail",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (
				url.pathname === "/api/v1/inventory/low-stock" &&
				request.method === "GET"
			) {
				const { handleGetLowStock } = await import(
					"./lib/api/ecommerce/low-stock"
				);
				const res = await handleGetLowStock(request);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-low-stock",
					res.status < 400 ? "success" : "failure",
					performance.now() - start,
				);
				return res;
			}

			if (url.pathname.startsWith("/api/")) {
				const res = new Response(
					JSON.stringify({
						success: false,
						error: `Not Found: ${request.method} ${url.pathname}`,
					}),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					},
				);
				res.headers.set("X-Request-Id", requestId);
				logOperation(
					{ requestId, tenantId: null, actorId: null, ipAddress: null },
					"api-not-found",
					"failure",
					performance.now() - start,
				);
				return res;
			}

			const handler = await getServerEntry();
			const response = await handler.fetch(request, env, ctx);
			return await normalizeCatastrophicSsrResponse(response, requestId);
		} catch (error) {
			logOperation(
				{ requestId, tenantId: null, actorId: null, ipAddress: null },
				"ssr",
				"failure",
				performance.now() - start,
				"uncaught",
				error instanceof Error ? error.message : String(error),
			);
			return new Response(renderErrorPage(error), {
				status: 500,
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		}
	},
};
