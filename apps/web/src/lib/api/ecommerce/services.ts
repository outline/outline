import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { getPortalServicesProgram } from "@/domain/portal/portal.programs";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { portalServices } from "@/infra/db/drizzle/schema";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

export const handleGetServices = async (
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

	if (!checkScope(validation, "services:read")) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Forbidden: API key missing required scope 'services:read'",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const sanitized = await runApp(
			Effect.gen(function* () {
				const db = yield* IDrizzleClient;
				let rows = yield* Effect.tryPromise(() =>
					db
						.select()
						.from(portalServices)
						.where(
							and(
								eq(portalServices.businessId, validation.businessId),
								eq(portalServices.isActive, true),
							),
						),
				);

				if (rows.length === 0) {
					const defaultServicesData = [
						{
							id: "b2184c90-410a-4282-b7b5-27419e4df101",
							businessId: validation.businessId,
							name: "Aquascape Setup & Design",
							description: "Desain dan perakitan aquascape profesional sesuai tema pilihan (Iwagumi, Dutch, Nature). Include tanaman & hardscape dasar.",
							durationMinutes: 180,
							price: "750000.00",
							category: "freshwater",
							isActive: true,
						},
						{
							id: "c4829fa0-512b-4393-c8c6-38520f5ef202",
							businessId: validation.businessId,
							name: "Maintenance Aquarium Regular",
							description: "Pembersihan kaca, pemangkasan tanaman (trimming), sisa pakan, ganti air 30%, dan pembersihan filter.",
							durationMinutes: 60,
							price: "150000.00",
							category: "freshwater",
							isActive: true,
						},
						{
							id: "d5930ab0-623c-4404-d9d7-49631a6f0303",
							businessId: validation.businessId,
							name: "Penyakit & Treatment Ikan",
							description: "Konsultasi dan karantina ikan sakit, diagnosa jamur/parasit (white spot, rot tail), serta pemberian obat steril.",
							durationMinutes: 45,
							price: "100000.00",
							category: "other",
							isActive: true,
						},
						{
							id: "e6041bc0-734d-4515-e0e8-5a742b7f0404",
							businessId: validation.businessId,
							name: "Custom Hardscape & Framing",
							description: "Penataan batu santen, kayu rasamala/driftwood, dan pasir silika custom siap pakai untuk tank Anda.",
							durationMinutes: 120,
							price: "350000.00",
							category: "terrarium",
							isActive: true,
						},
					];

					for (const s of defaultServicesData) {
						yield* Effect.tryPromise(() =>
							db.insert(portalServices).values(s).onConflictDoNothing(),
						);
					}

					rows = yield* Effect.tryPromise(() =>
						db
							.select()
							.from(portalServices)
							.where(
								and(
									eq(portalServices.businessId, validation.businessId),
									eq(portalServices.isActive, true),
								),
							),
					);
				}

				return rows.map((s) => ({
					id: s.id,
					name: s.name,
					description: s.description,
					durationMinutes: s.durationMinutes ?? 0,
					price: Number(s.price),
					category: s.category,
				}));
			}),
		);

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: sanitized,
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "public, max-age=60, s-maxage=300",
					},
				},
			),
		);
	} catch (error: any) {
		console.error("[API v1 Services] Error:", error);
		const msg = error instanceof Error ? error.message : String(error);
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Internal Server Error",
					details: msg,
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}
};
