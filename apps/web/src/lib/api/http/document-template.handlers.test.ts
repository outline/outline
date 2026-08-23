import { describe, expect, it, vi } from "vitest";
import { createDocumentTemplateHandlers } from "./document-template.handlers";

describe("REST document template handlers", () => {
	it("lists templates for the authenticated business", async () => {
		const list = vi.fn().mockResolvedValue([{ id: "template-1" }]);
		const handlers = createDocumentTemplateHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list,
			save: vi.fn(),
		});

		const response = await handlers.list(
			new Request("https://pet-store.test/api/v1/admin/document-templates", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"template-request",
		);

		expect(response.status).toBe(200);
		expect(list).toHaveBeenCalledWith("business-1");
	});

	it("requires template identity when saving", async () => {
		const save = vi.fn();
		const handlers = createDocumentTemplateHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list: vi.fn(),
			save,
		});

		const response = await handlers.save(
			new Request("https://pet-store.test/api/v1/admin/document-templates", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ type: "receipt" }),
			}),
			"template-request",
		);

		expect(response.status).toBe(422);
		expect(save).not.toHaveBeenCalled();
	});
});
