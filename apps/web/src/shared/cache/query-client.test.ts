import { describe, expect, it } from "vitest";
import { QUERY_POLICY } from "./cache-policy";
import { createAppQueryClient } from "./query-client";

describe("createAppQueryClient", () => {
	it("applies safe default cache policy", () => {
		const client = createAppQueryClient();
		const defaults = client.getDefaultOptions();

		expect(defaults.queries?.staleTime).toBe(
			QUERY_POLICY.operational.staleTime,
		);
		expect(defaults.queries?.gcTime).toBe(QUERY_POLICY.operational.gcTime);
		expect(defaults.queries?.retry).toBe(1);
		expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
		expect(defaults.queries?.refetchOnReconnect).toBe(true);
		expect(defaults.mutations?.retry).toBe(0);
	});
});
