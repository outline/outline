import { describe, expect, it } from "vitest";
import {
	ApiHttpError,
	jsonError,
	jsonSuccess,
} from "./response";

describe("REST response helpers", () => {
	it("returns a typed success payload with a request id", async () => {
		const response = jsonSuccess({ id: "branch-1" }, "request-1");

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect(await response.json()).toEqual({
			success: true,
			data: { id: "branch-1" },
			meta: { requestId: "request-1" },
		});
	});

	it("returns a safe typed error payload", async () => {
		const response = jsonError(
			new ApiHttpError(422, "validation_error", "Invalid branch name", {
				name: "Branch name is required",
			}),
			"request-2",
		);

		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({
			success: false,
			error: {
				code: "validation_error",
				message: "Invalid branch name",
				fields: { name: "Branch name is required" },
			},
			meta: { requestId: "request-2" },
		});
	});
});
