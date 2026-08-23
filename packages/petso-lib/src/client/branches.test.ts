import { afterEach, describe, expect, it, vi } from "vitest";
import { PetsoClient } from "./index";

describe("PetsoClient.branches.get", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("fetches the branch and returns the unwrapped data", async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					success: true,
					data: { id: "branch-1", name: "Cabang Pramuka", isActive: true },
				}),
				{ status: 200 },
			),
		);
		vi.stubGlobal("fetch", mockFetch);

		const client = new PetsoClient({
			baseUrl: "https://pet-store.treonstudio.com",
			apiKey: "test-key",
		});

		const result = await client.branches.get("branch-1");

		expect(result.id).toBe("branch-1");
		// No forced edge-cache directive: per-tenant authenticated data must
		// not be cached at Cloudflare's edge keyed only by URL (the cache key
		// doesn't vary by Authorization header) - freshness is governed by
		// the origin's own Cache-Control response header instead.
		expect(mockFetch).toHaveBeenCalledWith(
			"https://pet-store.treonstudio.com/api/v1/branches/branch-1",
			expect.not.objectContaining({ cf: expect.anything() }),
		);
	});

	it("throws PetsoClientError on a 404", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValue(
				new Response(
					JSON.stringify({ success: false, error: "Branch not found" }),
					{ status: 404 },
				),
			);
		vi.stubGlobal("fetch", mockFetch);

		const client = new PetsoClient({
			baseUrl: "https://pet-store.treonstudio.com",
			apiKey: "test-key",
		});

		await expect(client.branches.get("missing")).rejects.toThrow(
			"Branch not found",
		);
	});
});
