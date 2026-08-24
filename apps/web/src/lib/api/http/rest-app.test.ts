import { describe, expect, it, vi } from "vitest";
import type { AuthHandlers } from "./auth.handlers";
import { createRestRequestHandler, handleRestRequest } from "./rest-app";

describe("REST app", () => {
	it("serves a health response with a request id", async () => {
		const response = await handleRestRequest(
			new Request("https://pet-store.test/api/v1/health", {
				headers: { "X-Request-Id": "health-request" },
			}),
		);

		expect(response?.status).toBe(200);
		expect(response?.headers.get("X-Request-Id")).toBe("health-request");
		expect(await response?.json()).toEqual({
			success: true,
			data: { status: "ok" },
			meta: { requestId: "health-request" },
		});
	});

	it("returns undefined for routes not owned by the REST app yet", async () => {
		const response = await handleRestRequest(
			new Request("https://pet-store.test/api/v1/products"),
		);

		expect(response).toBeUndefined();
	});

	it("rejects unauthenticated admin REST requests before dispatch", async () => {
		const response = await handleRestRequest(
			new Request("https://pet-store.test/api/v1/admin/products"),
		);

		expect(response?.status).toBe(401);
		expect(await response?.json()).toMatchObject({
			success: false,
			error: { code: "unauthenticated" },
		});
	});

	it("fails closed for an unknown admin REST resource", async () => {
		const response = await handleRestRequest(
			new Request("https://pet-store.test/api/v1/admin/future-resource"),
		);

		expect(response?.status).toBe(401);
		expect(await response?.json()).toMatchObject({
			success: false,
			error: { code: "unauthenticated" },
		});
	});

	it("dispatches auth routes to the direct HTTP handlers", async () => {
		const loginResponse = new Response("login", { status: 200 });
		const authHandlers: AuthHandlers = {
			login: vi.fn().mockResolvedValue(loginResponse),
			signup: vi.fn(),
			logout: vi.fn(),
			session: vi.fn(),
		};
		const handleRequest = createRestRequestHandler(authHandlers);
		const request = new Request("https://pet-store.test/api/v1/auth/login", {
			method: "POST",
		});

		expect(await handleRequest(request)).toBe(loginResponse);
		expect(authHandlers.login).toHaveBeenCalledWith(
			request,
			expect.any(String),
		);
	});
});
