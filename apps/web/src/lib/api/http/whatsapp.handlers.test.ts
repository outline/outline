import { describe, expect, it, vi } from "vitest";
import { createWhatsAppHandlers } from "./whatsapp.handlers";

describe("REST WhatsApp handlers", () => {
	it("returns templates for the authenticated business", async () => {
		const templates = vi.fn().mockResolvedValue([{ id: "template-1" }]);
		const handlers = createWhatsAppHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			templates,
			messages: vi.fn(),
			send: vi.fn(),
		});
		const response = await handlers.templates(
			new Request("https://pet-store.test/api/v1/admin/whatsapp/templates", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"whatsapp-request",
		);
		expect(response.status).toBe(200);
		expect(templates).toHaveBeenCalledWith("business-1");
	});
});
