// @vitest-environment node

import { Data } from "effect";
import { describe, expect, it } from "vitest";

class TestData extends Data.TaggedClass("TestData")<{ id: string }> {}

describe("Effect Data.TaggedClass", () => {
	it("should be instantiable", () => {
		const data = new TestData({ id: "1" });
		expect(data._tag).toBe("TestData");
		expect(data.id).toBe("1");
	});
});
