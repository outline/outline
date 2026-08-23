import { describe, expect, it } from "vitest";
import { getPetStoreApiBaseUrl } from "./petsoClient";

describe("getPetStoreApiBaseUrl", () => {
	it("uses the configured API origin when present", () => {
		window.env = { PET_STORE_API_URL: "https://api.pet-store.test" };

		expect(getPetStoreApiBaseUrl()).toBe("https://api.pet-store.test");
	});

	it("uses the current origin by default", () => {
		window.env = {};

		expect(getPetStoreApiBaseUrl()).toBe(window.location.origin);
	});
});
