import { describe, expect, it, vi } from "vitest";
import { createGroomingHandlers } from "./grooming.handlers";

describe("REST grooming handlers", () => {
	it("lists appointments for the authenticated business", async () => {
		const appointments = [{ id: "appointment-1" }];
		const list = vi.fn().mockResolvedValue(appointments);
		const handlers = createGroomingHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list,
			updateStatus: vi.fn(),
		});

		const response = await handlers.list(
			new Request("https://pet-store.test/api/v1/admin/grooming/appointments", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"grooming-request",
		);

		expect(response.status).toBe(200);
		expect(list).toHaveBeenCalledWith("business-1");
		expect(await response.json()).toMatchObject({ data: appointments });
	});

	it("rejects an invalid appointment status", async () => {
		const updateStatus = vi.fn();
		const handlers = createGroomingHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list: vi.fn(),
			updateStatus,
		});

		const response = await handlers.updateStatus(
			new Request(
				"https://pet-store.test/api/v1/admin/grooming/appointments/a-1/status",
				{
					method: "PATCH",
					headers: {
						Cookie: "session_token=token-1",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: "finished" }),
				},
			),
			"grooming-request",
			"a-1",
		);

		expect(response.status).toBe(422);
		expect(updateStatus).not.toHaveBeenCalled();
	});
});
