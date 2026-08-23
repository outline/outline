import { getProductProgram } from "@/domain/product/product.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const handleGetProduct = async (
	request: Request,
	productId: string,
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

	if (!UUID_PATTERN.test(productId)) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Bad Request: productId must be a UUID.",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const product = await runApp(
			getProductProgram(productId, validation.businessId as TTenantId),
		);

		if (!product) {
			return withRateLimitHeaders(
				new Response(
					JSON.stringify({
						success: false,
						error: `Product ${productId} not found for this business.`,
					}),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		}

		return withRateLimitHeaders(
			new Response(JSON.stringify({ success: true, data: product }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
	} catch (error) {
		console.error("[API v1 Get Product] Error:", error);
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
