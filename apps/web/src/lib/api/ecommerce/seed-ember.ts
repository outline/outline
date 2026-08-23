import { eq } from "drizzle-orm";
import { validateApiKey } from "@/infra/auth/api-auth";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { branches, products } from "@/infra/db/drizzle/schema";
import { runApp } from "@/infra/runtime/app.runtime";
import { getResolvedConfig } from "@/shared/env/app.config";
import { Effect } from "effect";

const isProduction = (workerEnv?: unknown): boolean => {
	const envRecord = workerEnv as Record<string, string | undefined>;
	return (
		envRecord?.NODE_ENV === "production" ||
		envRecord?.ENVIRONMENT === "production" ||
		getResolvedConfig().environment === "production"
	);
};

const emberHeaders = (baseUrl: string, apiKey: string): Record<string, string> => ({
	Authorization: `Bearer ${apiKey}`,
	Origin: baseUrl,
	Referer: `${baseUrl.replace(/\/+$/, "")}/`,
});

const putToEmber = async (
	baseUrl: string,
	physicalBucket: string,
	apiKey: string,
	emberKey: string,
	body: ArrayBuffer | Uint8Array,
	contentType: string,
): Promise<{ url: string }> => {
	const form = new FormData();
	const blob = new Blob([body as BlobPart], { type: contentType });
	form.append("file", blob, emberKey.split("/").pop() ?? "file");
	form.append("key", emberKey);

	const url = `${baseUrl.replace(/\/+$/, "")}/api/v1/buckets/${physicalBucket}/objects/upload`;
	const response = await fetch(url, {
		method: "POST",
		headers: emberHeaders(baseUrl, apiKey),
		body: form,
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Ember upload failed ${response.status}: ${errText}`);
	}

	const json = (await response.json()) as { data: { url: string } };
	return { url: json.data.url };
};

export const handleSeedEmber = async (
	request: Request,
	workerEnv?: unknown,
): Promise<Response> => {
	if (isProduction(workerEnv)) {
		return new Response(JSON.stringify({ success: false, error: "Not Found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	const authHeader = request.headers.get("Authorization");
	const validation = await validateApiKey(authHeader);

	if (!validation) {
		return new Response(
			JSON.stringify({ success: false, error: "Unauthorized" }),
			{ status: 401, headers: { "Content-Type": "application/json" } },
		);
	}

	const envRecord = workerEnv as Record<string, string | undefined>;
	const apiKey = envRecord?.EMBER_API_KEY;
	const baseUrl = envRecord?.EMBER_BASE_URL;
	const bucket = envRecord?.EMBER_BUCKET;

	if (!apiKey || !baseUrl || !bucket) {
		return new Response(
			JSON.stringify({ success: false, error: "Storage configuration is missing" }),
			{
				status: 503,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		// 1. Seed/Upsert Himajin Hobby Branches
		await runApp(
			Effect.gen(function* () {
				const db = yield* IDrizzleClient;
				const branchesToSeed = [
					{
						id: "11751628-34d7-4119-888c-1f27aa6d281b",
						businessId: validation.businessId,
						name: "Himajin Hobby - Mentaos",
						address: "Jl. Mentaos Raya No. 45, Banjarbaru, Kalimantan Selatan 70711",
						phone: "+6281234567890",
						email: "cs@himajinhobby.com",
						whatsappNumber: "+6281234567890",
						streetAddress: "Jl. Mentaos Raya No. 45",
						addressLocality: "Banjarbaru",
						addressRegion: "Kalimantan Selatan",
						postalCode: "70711",
						addressCountry: "ID",
						isActive: true,
						operatingHours: {
							monday: { opens: "08:00", closes: "21:00", isClosed: false },
							tuesday: { opens: "08:00", closes: "21:00", isClosed: false },
							wednesday: { opens: "08:00", closes: "21:00", isClosed: false },
							thursday: { opens: "08:00", closes: "21:00", isClosed: false },
							friday: { opens: "08:00", closes: "21:00", isClosed: false },
							saturday: { opens: "08:00", closes: "21:00", isClosed: false },
							sunday: { opens: "08:00", closes: "21:00", isClosed: false },
						},
					},
					{
						id: "10e5a00a-5138-4262-ad92-acfc2db21ad1",
						businessId: validation.businessId,
						name: "Himajin Hobby - Landasan Ulin",
						address: "Jl. A. Yani Km 21 No. 88, Banjarbaru, Kalimantan Selatan 70724",
						phone: "+6281234567890",
						email: "cs@himajinhobby.com",
						whatsappNumber: "+6281234567890",
						streetAddress: "Jl. A. Yani Km 21 No. 88",
						addressLocality: "Banjarbaru",
						addressRegion: "Kalimantan Selatan",
						postalCode: "70724",
						addressCountry: "ID",
						isActive: true,
						operatingHours: {
							monday: { opens: "08:00", closes: "21:00", isClosed: false },
							tuesday: { opens: "08:00", closes: "21:00", isClosed: false },
							wednesday: { opens: "08:00", closes: "21:00", isClosed: false },
							thursday: { opens: "08:00", closes: "21:00", isClosed: false },
							friday: { opens: "08:00", closes: "21:00", isClosed: false },
							saturday: { opens: "08:00", closes: "21:00", isClosed: false },
							sunday: { opens: "08:00", closes: "21:00", isClosed: false },
						},
					},
				];

				for (const b of branchesToSeed) {
					yield* Effect.tryPromise(() =>
						db
							.insert(branches)
							.values(b)
							.onConflictDoUpdate({
								target: [branches.id],
								set: {
									name: b.name,
									address: b.address,
									phone: b.phone,
									email: b.email,
									whatsappNumber: b.whatsappNumber,
									streetAddress: b.streetAddress,
									addressLocality: b.addressLocality,
									addressRegion: b.addressRegion,
									postalCode: b.postalCode,
									addressCountry: b.addressCountry,
									isActive: b.isActive,
									operatingHours: b.operatingHours,
								},
							}),
					);
				}
			}),
		);

		let payload: { files?: Array<{ name: string; productName: string; base64: string }> } = {};
		try {
			payload = (await request.json()) as typeof payload;
		} catch {}

		const uploadedResults: Array<{ productName: string; emberUrl: string }> = [];

		if (payload && payload.files && Array.isArray(payload.files)) {
			for (const item of payload.files) {
				const binaryStr = atob(item.base64);
				const len = binaryStr.length;
				const bytes = new Uint8Array(len);
				for (let i = 0; i < len; i++) {
					bytes[i] = binaryStr.charCodeAt(i);
				}

				const emberKey = `product-images/${validation.businessId}/${item.name}`;
				const uploaded = await putToEmber(baseUrl, bucket, apiKey, emberKey, bytes, "image/png");

				await runApp(
					Effect.gen(function* () {
						const db = yield* IDrizzleClient;
						yield* Effect.tryPromise(() =>
							db
								.update(products)
								.set({ imageUrl: uploaded.url })
								.where(eq(products.name, item.productName)),
						);
					}),
				);

				uploadedResults.push({
					productName: item.productName,
					emberUrl: uploaded.url,
				});
			}
		}

		return new Response(
			JSON.stringify({ success: true, branchesSeeded: 2, uploaded: uploadedResults }),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (err) {
		return new Response(
			JSON.stringify({ success: false, error: String(err) }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
