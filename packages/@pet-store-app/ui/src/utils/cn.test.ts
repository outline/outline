import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn utility", () => {
	it("should merge class names correctly", () => {
		expect(cn("a", "b")).toBe("a b");
	});

	it("should handle conditional classes", () => {
		expect(cn("base", true && "active", false && "hidden")).toBe("base active");
	});

	it("should resolve tailwind conflicts", () => {
		expect(cn("px-2 p-4")).toBe("p-4");
		expect(cn("text-red-500 text-blue-500")).toBe("text-blue-500");
	});

	it("should handle objects and arrays", () => {
		expect(cn({ "is-active": true }, ["manual-class"])).toBe(
			"is-active manual-class",
		);
	});
});
