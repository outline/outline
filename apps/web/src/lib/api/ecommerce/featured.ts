import { getFeaturedProductsProgram } from "@/domain/product/product.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

export const handleGetFeatured = async (
	request: Request,
): Promise<Response> => {
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

	if (!checkScope(validation, "featured:read") && !checkScope(validation, "products:read")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'featured:read' or 'products:read'",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const products = await runApp(
			getFeaturedProductsProgram(validation.businessId as TTenantId),
		);

		const featured = products.map((p) => ({
			id: p.id,
			name: p.name,
			category: p.category,
			description: p.description,
			imageUrl: p.imageUrl,
			isFeatured: p.isFeatured,
			variants: p.variants.map((v) => ({
				id: v.id,
				name: v.name,
				sku: v.sku,
				price: v.price,
				stock: v.stock,
				unit: v.unit,
			})),
		}));

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: featured,
					meta: { total: featured.length },
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Featured] Error:", error);
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
