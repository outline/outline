import { getProductsPageProgram } from "@/domain/product/product.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

const parseSort = (value: string | null): "newest" | "popular" | undefined => {
	if (value === "newest" || value === "popular") return value;
	return undefined;
};

const parseNumberParam = (value: string | null): number | undefined => {
	if (value === null) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
};

export const handleGetProducts = async (
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

	try {
		const url = new URL(request.url);
		const search = url.searchParams.get("search");
		const category = url.searchParams.get("category");
		const minPrice = parseNumberParam(url.searchParams.get("minPrice"));
		const maxPrice = parseNumberParam(url.searchParams.get("maxPrice"));
		const sort = parseSort(url.searchParams.get("sort"));
		const limit = parseNumberParam(url.searchParams.get("limit"));
		const offset = parseNumberParam(url.searchParams.get("offset"));

		const { items, total } = await runApp(
			getProductsPageProgram(validation.businessId as TTenantId, {
				...(search ? { search } : {}),
				...(category ? { category } : {}),
				...(minPrice !== undefined ? { minPrice } : {}),
				...(maxPrice !== undefined ? { maxPrice } : {}),
				...(sort ? { sort } : {}),
				...(limit !== undefined ? { limit } : {}),
				...(offset !== undefined ? { offset } : {}),
			}),
		);

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: { products: items, total },
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=600",
					},
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Products] Error:", error);
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
