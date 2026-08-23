import { getDashboardMetricsProgram } from "@/domain/accounting";
import { getTopSellersProgram } from "@/domain/dashboard/dashboard.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

export const handleGetDashboardSummary = async (
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

	if (!checkScope(validation, "dashboard:read")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'dashboard:read'",
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

		const [metrics, topSellers] = await Promise.all([
			runApp(getDashboardMetricsProgram(tenantId)),
			runApp(getTopSellersProgram(tenantId)),
		]);

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: {
						metrics,
						topSellers,
						generatedAt: new Date().toISOString(),
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Dashboard Summary] Error:", error);
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
