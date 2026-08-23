import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TApiKeyScope } from "@/infra/auth/api-auth";
import { checkScope } from "@/infra/auth/api-auth";
import { handleGetBranch } from "./branch-detail";

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

const VALID_BRANCH_ID = "11111111-1111-1111-1111-111111111111";

const buildValidation = (scopes: readonly TApiKeyScope[]) => ({
	businessId: "biz-1" as never,
	keyId: "key-1",
	scopes,
});

const buildRequest = (auth: string | null = "Bearer valid-key") => {
	const headers = new Headers();
	if (auth) headers.set("Authorization", auth);
	return new Request(`http://localhost/api/v1/branches/${VALID_BRANCH_ID}`, {
		headers,
	});
};

const buildBranch = (overrides: Record<string, unknown> = {}) => ({
	id: VALID_BRANCH_ID,
	name: "Main Branch",
	address: "Jl. Main No.1",
	phone: "021-1234567",
	isActive: true,
	email: null,
	whatsappNumber: null,
	streetAddress: null,
	addressLocality: null,
	addressRegion: null,
	postalCode: null,
	addressCountry: null,
	latitude: null,
	longitude: null,
	operatingHours: null,
	createdAt: new Date("2026-01-01").toISOString(),
	...overrides,
});

describe("branches:read scope", () => {
	it("is recognized by checkScope", () => {
		const validation = {
			businessId: "biz-1" as never,
			keyId: "key-1",
			scopes: ["branches:read"] as const,
		};
		expect(checkScope(validation, "branches:read")).toBe(true);
	});

	it("is rejected when missing from scopes", () => {
		const validation = {
			businessId: "biz-1" as never,
			keyId: "key-1",
			scopes: ["products:read"] as const,
		};
		expect(checkScope(validation, "branches:read")).toBe(false);
	});
});

describe("handleGetBranch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 with success envelope and cache headers when branch is active", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		const { runApp } = await import("@/infra/runtime/app.runtime");
		vi.mocked(validateApiKey).mockResolvedValue(
			buildValidation(["branches:read"]),
		);
		const branch = buildBranch();
		vi.mocked(runApp).mockResolvedValue(branch);

		const response = await handleGetBranch(buildRequest(), VALID_BRANCH_ID);

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe(
			"public, max-age=60, s-maxage=300",
		);
		const body = await response.json();
		expect(body).toEqual({ success: true, data: branch });
	});

	it("returns 404 when getBranchProgram resolves null (not found)", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		const { runApp } = await import("@/infra/runtime/app.runtime");
		vi.mocked(validateApiKey).mockResolvedValue(
			buildValidation(["branches:read"]),
		);
		vi.mocked(runApp).mockResolvedValue(null);

		const response = await handleGetBranch(buildRequest(), VALID_BRANCH_ID);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.success).toBe(false);
	});

	it("returns 404 when branch exists but isActive is false", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		const { runApp } = await import("@/infra/runtime/app.runtime");
		vi.mocked(validateApiKey).mockResolvedValue(
			buildValidation(["branches:read"]),
		);
		vi.mocked(runApp).mockResolvedValue(buildBranch({ isActive: false }));

		const response = await handleGetBranch(buildRequest(), VALID_BRANCH_ID);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.success).toBe(false);
	});

	it("returns 400 when branchId is not a UUID", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		vi.mocked(validateApiKey).mockResolvedValue(
			buildValidation(["branches:read"]),
		);

		const response = await handleGetBranch(buildRequest(), "not-a-uuid");

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.success).toBe(false);
	});

	it("returns 401 when validateApiKey returns null", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		vi.mocked(validateApiKey).mockResolvedValue(null);

		const response = await handleGetBranch(buildRequest(null), VALID_BRANCH_ID);

		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.success).toBe(false);
	});

	it("returns 403 when API key is missing the branches:read scope", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		vi.mocked(validateApiKey).mockResolvedValue(
			buildValidation(["products:read"]),
		);

		const response = await handleGetBranch(buildRequest(), VALID_BRANCH_ID);

		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body.success).toBe(false);
	});

	it("returns 500 when the branch lookup throws", async () => {
		const { validateApiKey } = await import("@/infra/auth/api-auth");
		const { runApp } = await import("@/infra/runtime/app.runtime");
		vi.mocked(validateApiKey).mockResolvedValue(
			buildValidation(["branches:read"]),
		);
		vi.mocked(runApp).mockRejectedValue(new Error("db unavailable"));

		const response = await handleGetBranch(buildRequest(), VALID_BRANCH_ID);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.success).toBe(false);
	});
});
