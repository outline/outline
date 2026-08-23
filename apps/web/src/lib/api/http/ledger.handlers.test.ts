import { describe, expect, it, vi } from "vitest";
import { createLedgerHandlers } from "./ledger.handlers";

describe("REST ledger handlers", () => {
	it("loads accounts for the authenticated business", async () => {
		const accounts = vi.fn().mockResolvedValue([]);
		const handlers = createLedgerHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			accounts,
			journal: vi.fn(),
		});

		const response = await handlers.accounts(
			new Request("https://pet-store.test/api/v1/admin/accounting/accounts", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"ledger-request",
		);

		expect(response.status).toBe(200);
		expect(accounts).toHaveBeenCalledWith("business-1");
	});
});
