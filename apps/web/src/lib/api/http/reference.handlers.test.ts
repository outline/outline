import { describe, expect, it, vi } from "vitest";
import { createReferenceHandlers } from "./reference.handlers";

describe("REST reference handlers", () => {
	it("lists suppliers for the authenticated business", async () => {
		const suppliers = vi.fn().mockResolvedValue([{ id: "supplier-1" }]);
		const handlers = createReferenceHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			suppliers,
			warehouses: vi.fn(),
		});

		const response = await handlers.list(
			"suppliers",
			new Request("https://pet-store.test/api/v1/admin/suppliers", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"reference-request",
		);

		expect(response.status).toBe(200);
		expect(suppliers).toHaveBeenCalledWith("business-1");
	});
});
