import { getProductsProgram } from "@/domain/product/product.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 25;

export const handleGetProductSuggestions = async (
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

	if (!checkScope(validation, "products:read")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'products:read'",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	const url = new URL(request.url);
	const q = (url.searchParams.get("q") ?? "").trim();
	const limitParam = Number.parseInt(
		url.searchParams.get("limit") ?? String(DEFAULT_LIMIT),
		10,
	);
	const limit = Math.min(
		Math.max(
			Number.isFinite(limitParam) && limitParam > 0
				? limitParam
				: DEFAULT_LIMIT,
			1,
		),
		MAX_LIMIT,
	);

	if (q.length === 0) {
		return withRateLimitHeaders(
			new Response(JSON.stringify({ success: true, data: [] }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
	}

	try {
		const products = await runApp(
			getProductsProgram(validation.businessId as TTenantId),
		);

		const needle = q.toLowerCase();
		const matches = products
			.filter((p) => {
				if (p.name.toLowerCase().includes(needle)) return true;
				if (p.category?.toLowerCase().includes(needle)) return true;
				if (p.brand?.toLowerCase().includes(needle)) return true;
				if (p.description?.toLowerCase().includes(needle)) return true;
				if (
					p.variants.some((v) =>
						typeof v.sku === "string"
							? v.sku.toLowerCase().includes(needle)
							: false,
					)
				)
					return true;
				return false;
			})
			.slice(0, limit)
			.map((p) => ({
				id: p.id,
				name: p.name,
				category: p.category,
				imageUrl: p.imageUrl,
				minPrice:
					p.variants.length > 0
						? Math.min(...p.variants.map((v) => v.price))
						: null,
				isFeatured: p.isFeatured,
			}));

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: matches,
					meta: { total: matches.length, query: q },
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Product Suggestions] Error:", error);
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
