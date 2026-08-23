import { describe, expect, it, vi } from "vitest";
import { createAuthHandlers } from "./auth.handlers";

const requestId = "auth-request";

describe("REST auth handlers", () => {
	it("logs in and sets the session cookie", async () => {
		const login = vi.fn().mockResolvedValue({
			userId: "user-1",
			token: "token-1",
		});
		const handlers = createAuthHandlers({
			login,
			signup: vi.fn(),
			logout: vi.fn(),
			session: vi.fn(),
		});

		const response = await handlers.login(
			new Request("http://pet-store.test/api/v1/auth/login", {
				method: "POST",
				body: JSON.stringify({ email: "owner@example.com", password: "password" }),
				headers: { "Content-Type": "application/json" },
			}),
			requestId,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Set-Cookie")).toContain("session_token=token-1");
		expect(await response.json()).toMatchObject({
			success: true,
			data: { userId: "user-1" },
		});
		expect(login).toHaveBeenCalledWith({
			email: "owner@example.com",
			password: "password",
		});
	});

	it("rejects malformed login input", async () => {
		const login = vi.fn();
		const handlers = createAuthHandlers({
			login,
			signup: vi.fn(),
			logout: vi.fn(),
			session: vi.fn(),
		});

		const response = await handlers.login(
			new Request("http://pet-store.test/api/v1/auth/login", {
				method: "POST",
				body: JSON.stringify({ email: "" }),
			}),
			requestId,
		);

		expect(response.status).toBe(422);
		expect(login).not.toHaveBeenCalled();
	});

	it("signs up and starts a session", async () => {
		const signup = vi.fn().mockResolvedValue({
			userId: "user-1",
			businessId: "business-1",
			token: "token-1",
		});
		const handlers = createAuthHandlers({
			login: vi.fn(),
			signup,
			logout: vi.fn(),
			session: vi.fn(),
		});

		const response = await handlers.signup(
			new Request("https://pet-store.test/api/v1/auth/signup", {
				method: "POST",
				body: JSON.stringify({
					email: "owner@example.com",
					password: "password",
					fullName: "Owner",
					businessName: "Pet Store",
				}),
			}),
			requestId,
		);

		expect(response.status).toBe(201);
		expect(response.headers.get("Set-Cookie")).toContain("session_token=token-1");
		expect(signup).toHaveBeenCalledOnce();
	});

	it("logs out and expires the session cookie", async () => {
		const logout = vi.fn().mockResolvedValue(undefined);
		const handlers = createAuthHandlers({
			login: vi.fn(),
			signup: vi.fn(),
			logout,
			session: vi.fn(),
		});

		const response = await handlers.logout(
			new Request("http://pet-store.test/api/v1/auth/logout", {
				method: "POST",
				headers: { Cookie: "session_token=token-1" },
			}),
			requestId,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
		expect(logout).toHaveBeenCalledWith("token-1");
	});

	it("returns the current session for an authenticated request", async () => {
		const session = vi.fn().mockResolvedValue({
			user: {
				id: "user-1",
				email: "owner@example.com",
				name: "Owner",
				avatarUrl: null,
				language: "en_US",
				role: "owner",
			},
			business: {
				id: "business-1",
				name: "Pet Store",
				slug: "pet-store",
				logoUrl: null,
			},
			branches: [],
			permissions: { isAdmin: true },
		});
		const handlers = createAuthHandlers({
			login: vi.fn(),
			signup: vi.fn(),
			logout: vi.fn(),
			session,
		});

		const response = await handlers.session(
			new Request("http://pet-store.test/api/v1/auth/session", {
				headers: { Cookie: "session_token=token-1" },
			}),
			requestId,
		);

		expect(response.status).toBe(200);
		expect(session).toHaveBeenCalledWith("token-1");
		expect(await response.json()).toMatchObject({
			success: true,
			data: { user: { id: "user-1" } },
		});
	});
});
