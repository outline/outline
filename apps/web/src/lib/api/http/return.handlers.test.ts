import { describe, expect, it, vi } from "vitest";
import { createReturnHandlers } from "./return.handlers";

describe("REST return handlers", () => {
	it("creates a return for the authenticated user", async () => {
		const create = vi.fn().mockResolvedValue("return-1");
		const handlers = createReturnHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
			}),
			list: vi.fn(),
			create,
		});

		const response = await handlers.create(
			new Request("https://pet-store.test/api/v1/admin/returns", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ orderId: "order-1", items: [] }),
			}),
			"return-request",
		);

		expect(response.status).toBe(201);
		expect(create).toHaveBeenCalledWith("business-1", "user-1", {
			orderId: "order-1",
			items: [],
		});
	});
});
