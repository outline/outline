import { getLowStockProgram } from "@/domain/product/product.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

export const handleGetLowStock = async (
	request: Request,
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

	if (!checkScope(validation, "inventory:read")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'inventory:read'",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	const url = new URL(request.url);
	const limit = Math.min(
		Math.max(
			Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
			1,
		),
		200,
	);
	const offset = Math.max(
		Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
		0,
	);

	try {
		const { items, total } = await runApp(
			getLowStockProgram(validation.businessId as TTenantId, {
				limit,
				offset,
			}),
		);

		const serialized = items.map(({ variant, product }) => ({
			variant: {
				id: variant.id,
				name: variant.name,
				sku: variant.sku,
				price: variant.price,
				stock: variant.stock,
				unit: variant.unit,
				lowStockThreshold: variant.lowStockThreshold,
				deficit: Math.max(0, variant.lowStockThreshold - variant.stock),
			},
			product: product
				? {
						id: product.id,
						name: product.name,
						category: product.category,
						imageUrl: product.imageUrl,
					}
				: null,
		}));

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: serialized,
					meta: {
						total,
						limit,
						offset,
						hasMore: offset + serialized.length < total,
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Low Stock] Error:", error);
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
