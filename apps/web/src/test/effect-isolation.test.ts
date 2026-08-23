import { Data } from "effect";
import { describe, expect, it } from "vitest";

class TestError extends Data.TaggedError("TestError")<Record<string, never>> {}

describe("Effect Data.TaggedError", () => {
	it("should be instantiable", () => {
		const err = new TestError({});
		expect(err._tag).toBe("TestError");
	});
});
