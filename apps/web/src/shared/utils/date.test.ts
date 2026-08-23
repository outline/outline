import { describe, expect, it } from "vitest";
import { DateUtils } from "./date";

describe("DateUtils", () => {
	it("should format date to short ISO (YYYY-MM-DD)", () => {
		const date = new Date("2026-06-08T10:00:00Z");
		expect(DateUtils.toShortDate(date)).toBe("2026-06-08");
	});

	it("should return empty string for invalid dates", () => {
		expect(DateUtils.toShortDate("invalid")).toBe("");
	});

	it("should calculate start of day correctly", () => {
		const date = new Date("2026-06-08T15:30:00Z");
		const start = DateUtils.startOfDay(date);
		expect(start.getHours()).toBe(0);
		expect(start.getMinutes()).toBe(0);
		expect(start.getSeconds()).toBe(0);
		expect(start.getMilliseconds()).toBe(0);
	});

	it("should calculate start of month correctly", () => {
		const date = new Date("2026-06-08T15:30:00Z");
		const start = DateUtils.startOfMonth(date);
		expect(start.getDate()).toBe(1);
		expect(start.getMonth()).toBe(5); // June is index 5
		expect(start.getFullYear()).toBe(2026);
	});

	it("should add days correctly", () => {
		const date = new Date("2026-06-08T15:30:00Z");
		const next = DateUtils.addDays(date, 5);
		expect(next.getDate()).toBe(13);
	});
});
