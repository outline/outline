import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TStaffId } from "@/domain/staff/staff.types";
import type { TTenantId } from "@/shared/types/common.types";
import {
	createAttendanceEntity,
	createScheduleEntity,
	updateScheduleData,
} from "./shift.module";

const tenantId = "tenant-1" as TTenantId;
const staffId = "staff-1" as TStaffId;

describe("ShiftModule", () => {
	describe("createScheduleEntity", () => {
		it("should create a schedule entity with valid data", () => {
			const data = {
				staffId,
				dayOfWeek: 1,
				startTime: "08:00",
				endTime: "17:00",
				isOffDay: false,
			};

			const result = Effect.runSync(createScheduleEntity(tenantId, data));

			expect(result.tenantId).toBe(tenantId);
			expect(result.staffId).toBe(staffId);
			expect(result.dayOfWeek).toBe(1);
			expect(result.startTime).toBe("08:00");
			expect(result.endTime).toBe("17:00");
			expect(result.isOffDay).toBe(false);
		});

		it("should create an off-day schedule", () => {
			const data = {
				staffId,
				dayOfWeek: 0,
				startTime: "00:00",
				endTime: "00:00",
				isOffDay: true,
			};

			const result = Effect.runSync(createScheduleEntity(tenantId, data));

			expect(result.isOffDay).toBe(true);
			expect(result.dayOfWeek).toBe(0);
		});
	});

	describe("updateScheduleData", () => {
		it("should produce updates for provided fields only", () => {
			const data = { id: "sched-1", startTime: "09:00", endTime: "18:00" };

			const result = Effect.runSync(updateScheduleData(data));

			expect(result.startTime).toBe("09:00");
			expect(result.endTime).toBe("18:00");
			expect(result.dayOfWeek).toBeUndefined();
			expect(result.isOffDay).toBeUndefined();
		});

		it("should handle all fields update", () => {
			const data = {
				id: "sched-1",
				dayOfWeek: 5,
				startTime: "10:00",
				endTime: "19:00",
				isOffDay: false,
			};

			const result = Effect.runSync(updateScheduleData(data));

			expect(result.dayOfWeek).toBe(5);
			expect(result.startTime).toBe("10:00");
			expect(result.endTime).toBe("19:00");
			expect(result.isOffDay).toBe(false);
		});
	});

	describe("createAttendanceEntity", () => {
		it("should create an attendance entity with clock-in time", () => {
			const data = {
				staffId,
				date: "2026-06-20",
				notes: null,
			};

			const result = Effect.runSync(createAttendanceEntity(tenantId, data));

			expect(result.tenantId).toBe(tenantId);
			expect(result.staffId).toBe(staffId);
			expect(result.date).toBe("2026-06-20");
			expect(result.clockIn).toBeInstanceOf(Date);
			expect(result.clockOut).toBeNull();
			expect(result.notes).toBeNull();
		});

		it("should populate notes when provided", () => {
			const data = {
				staffId,
				date: "2026-06-20",
				notes: "Late arrival",
			};

			const result = Effect.runSync(createAttendanceEntity(tenantId, data));

			expect(result.notes).toBe("Late arrival");
		});
	});
});
