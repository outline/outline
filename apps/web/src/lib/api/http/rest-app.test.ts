import { describe, expect, it } from "vitest";
import { handleRestRequest } from "./rest-app";

describe("REST app", () => {
	it("serves a health response with a request id", async () => {
		const response = await handleRestRequest(
			new Request("https://pet-store.test/api/v1/health", {
				headers: { "X-Request-Id": "health-request" },
			}),
		);

		expect(response?.status).toBe(200);
		expect(response?.headers.get("X-Request-Id")).toBe("health-request");
		expect(await response?.json()).toEqual({
			success: true,
			data: { status: "ok" },
			meta: { requestId: "health-request" },
		});
	});

	it("returns undefined for routes not owned by the REST app yet", async () => {
		const response = await handleRestRequest(
			new Request("https://pet-store.test/api/v1/products"),
		);

		expect(response).toBeUndefined();
	});
});
