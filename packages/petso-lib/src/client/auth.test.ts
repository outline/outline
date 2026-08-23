import { afterEach, describe, expect, it, vi } from "vitest";
import { PetsoClient } from "./index";

describe("PetsoClient.auth", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("logs in through the direct REST API with browser credentials", async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					success: true,
					data: { userId: "user-1" },
					meta: { requestId: "request-1" },
				}),
				{ status: 200 },
			),
		);
		vi.stubGlobal("fetch", mockFetch);

		const client = new PetsoClient({ baseUrl: "https://pet-store.test" });
		const result = await client.auth.login({
			email: "owner@example.com",
			password: "password",
		});

		expect(result.userId).toBe("user-1");
		expect(mockFetch).toHaveBeenCalledWith(
			"https://pet-store.test/api/v1/auth/login",
			expect.objectContaining({
				method: "POST",
				credentials: "include",
			}),
		);
	});

	it("wraps network failures as a PetsoClientError", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

		const client = new PetsoClient({ baseUrl: "https://pet-store.test" });

		await expect(client.auth.session()).rejects.toMatchObject({
			name: "PetsoClientError",
			status: 0,
		});
	});
});
