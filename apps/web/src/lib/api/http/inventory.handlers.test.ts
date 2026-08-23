import { describe, expect, it, vi } from "vitest";
import { createInventoryHandlers } from "./inventory.handlers";

describe("REST inventory handlers", () => {
	it("returns an authenticated inventory snapshot", async () => {
		const snapshot = vi.fn().mockResolvedValue({ batches: [], movements: [] });
		const handlers = createInventoryHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			snapshot,
			adjust: vi.fn(),
		});

		const response = await handlers.snapshot(
			new Request("https://pet-store.test/api/v1/admin/inventory", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"inventory-request",
		);

		expect(response.status).toBe(200);
		expect(snapshot).toHaveBeenCalledWith("business-1");
	});

	it("passes a stock adjustment to the domain", async () => {
		const adjust = vi.fn();
		const handlers = createInventoryHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			snapshot: vi.fn(),
			adjust,
		});

		const response = await handlers.adjust(
			new Request("https://pet-store.test/api/v1/admin/inventory/adjust", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					variantId: "variant-1",
					quantity: -2,
					notes: "Sale",
				}),
			}),
			"inventory-request",
		);

		expect(response.status).toBe(200);
		expect(adjust).toHaveBeenCalledWith("business-1", {
			variantId: "variant-1",
			quantity: -2,
			notes: "Sale",
		});
	});
});
