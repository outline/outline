import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TApiKeyScope } from "@/infra/auth/api-auth";
import { handleGetServices } from "./services";

vi.mock("@/infra/runtime/app.runtime", () => ({
	runApp: vi.fn(),
}));

vi.mock("@/infra/auth/api-auth", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/infra/auth/api-auth")>();
	return {
		...actual,
		validateApiKey: vi.fn(),
	};
});

const buildValidation = (scopes: readonly TApiKeyScope[]) => ({
	businessId: "biz-1" as never,
	keyId: "key-1",
	scopes,
});

const buildRequest = (auth: string | null = "Bearer valid-key") => {
	const headers = new Headers();
	if (auth) headers.set("Authorization", auth);
	return new Request("http://localhost/api/v1/services", { headers });
};

describe("handleGetServices", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when the API key is invalid", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		vi.mocked(validateApiKey).mockResolvedValue(null);

		const response = await handleGetServices(buildRequest(null));

		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.success).toBe(false);
	});

	it("returns 403 when the key lacks services:read", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		vi.mocked(validateApiKey).mockResolvedValue(
			buildValidation(["products:read"]),
		);

		const response = await handleGetServices(buildRequest());

		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body.success).toBe(false);
	});

	it("returns 200 with mapped service data and the Cache-Control header", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		const { runApp } = await import("@/infra/runtime/app.runtime");
		vi.mocked(validateApiKey).mockResolvedValue(
			buildValidation(["services:read"]),
		);
		vi.mocked(runApp).mockResolvedValue([
			{
				id: "svc-1",
				tenantId: "biz-1",
				name: "Instalasi Aquascape Custom",
				description: "Jasa desain & pasang aquascape.",
				durationMinutes: 120,
				price: 350000,
				isActive: true,
				category: "freshwater",
			},
		]);

		const response = await handleGetServices(buildRequest());
		const body = (await response.json()) as {
			success: boolean;
			data: Array<{ id: string; category: string }>;
		};

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe(
			"public, max-age=60, s-maxage=300",
		);
		expect(body.success).toBe(true);
		expect(body.data).toEqual([
			{
				id: "svc-1",
				tenantId: "biz-1",
				name: "Instalasi Aquascape Custom",
				description: "Jasa desain & pasang aquascape.",
				durationMinutes: 120,
				price: 350000,
				isActive: true,
				category: "freshwater",
			},
		]);
	});

	it("returns 500 when the program throws", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		const { runApp } = await import("@/infra/runtime/app.runtime");
		vi.mocked(validateApiKey).mockResolvedValue(
			buildValidation(["services:read"]),
		);
		vi.mocked(runApp).mockRejectedValue(new Error("db down"));

		const response = await handleGetServices(buildRequest());

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.success).toBe(false);
	});
});
