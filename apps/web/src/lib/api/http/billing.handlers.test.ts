import { describe, expect, it, vi } from "vitest";
import { createBillingHandlers } from "./billing.handlers";

describe("REST billing handlers", () => {
	it("returns the billing summary for the authenticated business", async () => {
		const get = vi.fn().mockResolvedValue({ usage: { products: 1 } });
		const handlers = createBillingHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			get,
			changePlan: vi.fn(),
		});
		const response = await handlers.get(
			new Request("https://pet-store.test/api/v1/admin/billing", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"billing-request",
		);
		expect(response.status).toBe(200);
		expect(get).toHaveBeenCalledWith("business-1");
	});

	it("passes the authenticated user to a plan change", async () => {
		const session = {
			business: { id: "business-1" },
			user: { id: "user-1", name: "Owner", email: "owner@petso.test" },
		};
		const changePlan = vi.fn().mockResolvedValue({
			changed: false,
			redirectUrl: "https://app.sandbox.midtrans.com/redirect",
		});
		const handlers = createBillingHandlers({
			session: vi.fn().mockResolvedValue(session),
			get: vi.fn(),
			changePlan,
		});
		const response = await handlers.changePlan(
			new Request("https://pet-store.test/api/v1/admin/billing/plan", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ plan: "pro" }),
			}),
			"billing-change-request",
		);

		expect(response.status).toBe(200);
		expect(changePlan).toHaveBeenCalledWith(session, { plan: "pro" });
	});
});
