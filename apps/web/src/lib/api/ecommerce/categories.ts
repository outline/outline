import { getProductsProgram } from "@/domain/product/product.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

export const handleGetCategories = async (
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

	if (!checkScope(validation, "categories:read")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'categories:read'",
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
			getProductsProgram(validation.businessId as TTenantId),
		);

		const categories = Array.from(
			new Set(
				products.map((p) => p.category?.trim() ?? "").filter((c) => c !== ""),
			),
		).sort();

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: categories,
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=1200",
					},
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Categories] Error:", error);
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
