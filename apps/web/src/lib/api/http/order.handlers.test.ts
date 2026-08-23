import { describe, expect, it, vi } from "vitest";
import { createOrderHandlers } from "./order.handlers";

describe("REST order handlers", () => {
	it("creates a POS order for the active branch", async () => {
		const create = vi.fn().mockResolvedValue({ id: "order-1" });
		const handlers = createOrderHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
				branchId: "branch-1",
			}),
			list: vi.fn(),
			create,
			void: vi.fn(),
		});

		const response = await handlers.create(
			new Request("https://pet-store.test/api/v1/admin/orders", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ items: [{ productId: "product-1" }] }),
			}),
			"order-request",
		);

		expect(response.status).toBe(201);
		expect(create).toHaveBeenCalledWith("business-1", "user-1", {
			branchId: "branch-1",
			items: [{ productId: "product-1" }],
		});
	});
});
