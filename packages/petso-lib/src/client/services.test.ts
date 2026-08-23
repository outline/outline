import { afterEach, describe, expect, it, vi } from "vitest";
import { PetsoClient } from "./index";

describe("PetsoClient.services.list", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("fetches the service list without forcing an edge-cache directive", async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					success: true,
					data: [
						{
							id: "svc-1",
							name: "Instalasi Aquascape Custom",
							description: null,
							durationMinutes: 180,
							price: 350000,
							category: "freshwater",
						},
					],
				}),
				{ status: 200 },
			),
		);
		vi.stubGlobal("fetch", mockFetch);

		const client = new PetsoClient({
			baseUrl: "https://pet-store.treonstudio.com",
			apiKey: "test-key",
		});

		const result = await client.services.list();

		expect(result).toHaveLength(1);
		expect(result[0]?.category).toBe("freshwater");
		// No forced edge-cache directive: per-tenant authenticated data must
		// not be cached at Cloudflare's edge keyed only by URL (the cache key
		// doesn't vary by Authorization header) - freshness is governed by
		// the origin's own Cache-Control response header instead.
		expect(mockFetch).toHaveBeenCalledWith(
			"https://pet-store.treonstudio.com/api/v1/services",
			expect.not.objectContaining({ cf: expect.anything() }),
		);
	});
});
