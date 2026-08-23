import { describe, expect, it, vi } from "vitest";
import { createExpenseHandlers } from "./expense.handlers";

describe("REST expense handlers", () => {
	it("lists expenses for the authenticated business", async () => {
		const list = vi.fn().mockResolvedValue([]);
		const handlers = createExpenseHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
			}),
			list,
			create: vi.fn(),
		});

		const response = await handlers.list(
			new Request("https://pet-store.test/api/v1/admin/expenses", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"expense-request",
		);

		expect(response.status).toBe(200);
		expect(list).toHaveBeenCalledWith("business-1");
	});
});
