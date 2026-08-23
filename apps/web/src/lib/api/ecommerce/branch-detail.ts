import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { getBranchProgram } from "@/domain/branch/branch.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { branches } from "@/infra/db/drizzle/schema";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const handleGetBranch = async (
	request: Request,
	branchId: string,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Unauthorized: Invalid or missing API key.",
				}),
				{ status: 401, headers: { "Content-Type": "application/json" } },
			),
		);
	}

	if (!checkScope(validation, "branches:read")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'branches:read'",
				}),
				{ status: 403, headers: { "Content-Type": "application/json" } },
			),
		);
	}

	if (!UUID_PATTERN.test(branchId)) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Bad Request: branchId must be a UUID.",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			),
		);
	}

	try {
		const branchData = await runApp(
			Effect.gen(function* () {
				const db = yield* IDrizzleClient;
				const [row] = yield* Effect.tryPromise(() =>
					db
						.select()
						.from(branches)
						.where(
							and(
								eq(branches.id, branchId),
								eq(branches.businessId, validation.businessId),
							),
						)
						.limit(1),
				);

				if (!row) return null;

				return {
					id: row.id,
					name: row.name,
					address: row.address,
					phone: row.phone,
					isActive: row.isActive,
					email: row.email,
					whatsappNumber: row.whatsappNumber,
					streetAddress: row.streetAddress,
					addressLocality: row.addressLocality,
					addressRegion: row.addressRegion,
					postalCode: row.postalCode,
					addressCountry: row.addressCountry,
					latitude: row.latitude ? Number(row.latitude) : null,
					longitude: row.longitude ? Number(row.longitude) : null,
					operatingHours: row.operatingHours,
					createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
				};
			}),
		);

		if (!branchData || !branchData.isActive) {
			return withRateLimitHeaders(
				new Response(
					JSON.stringify({
						success: false,
						error: `Branch ${branchId} not found for this business.`,
					}),
					{ status: 404, headers: { "Content-Type": "application/json" } },
				),
			);
		}

		return withRateLimitHeaders(
			new Response(JSON.stringify({ success: true, data: branchData }), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "public, max-age=60, s-maxage=300",
				},
			}),
		);
	} catch (error) {
		console.error("[API v1 Get Branch] Error:", error);
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({ success: false, error: "Internal Server Error" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			),
		);
	}
};
