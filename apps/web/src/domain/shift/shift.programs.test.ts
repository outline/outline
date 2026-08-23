import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TStaffId } from "@/domain/staff/staff.types";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { StaffScheduleNotFoundError } from "./shift.errors";
import {
	clockInProgram,
	clockOutProgram,
	deleteStaffScheduleProgram,
	getAttendanceProgram,
	getStaffAttendanceHistoryProgram,
	getStaffSchedulesProgram,
	saveStaffScheduleProgram,
	updateStaffScheduleProgram,
} from "./shift.programs";
import { type IShiftRepository, ShiftRepository } from "./shift.repository";
import type {
	TStaffAttendance,
	TStaffAttendanceId,
	TStaffSchedule,
	TStaffScheduleId,
} from "./shift.types";

const tenantId = generateId() as TTenantId;
const staffId = generateId() as TStaffId;
const scheduleId = generateId() as TStaffScheduleId;
const attendanceId = generateId() as TStaffAttendanceId;

const mockSchedule: TStaffSchedule = {
	id: scheduleId,
	tenantId,
	staffId,
	dayOfWeek: 1,
	startTime: "08:00",
	endTime: "17:00",
	isOffDay: false,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockAttendance: TStaffAttendance = {
	id: attendanceId,
	tenantId,
	staffId,
	date: "2026-06-20",
	clockIn: new Date(),
	clockOut: null,
	notes: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

function makeRepoMock(
	overrides: Partial<IShiftRepository> = {},
): IShiftRepository {
	return {
		findSchedulesByStaffId: vi.fn(),
		saveSchedule: vi.fn(),
		updateSchedule: vi.fn(),
		deleteSchedule: vi.fn(),
		findAttendanceByDate: vi.fn(),
		findAttendanceByDateRange: vi.fn(),
		saveAttendance: vi.fn(),
		updateAttendance: vi.fn(),
		...overrides,
	};
}

function makeLayer(repo: IShiftRepository) {
	return Layer.succeed(ShiftRepository, repo);
}

describe("getStaffSchedulesProgram", () => {
	it("returns schedules for a staff member", async () => {
		const repo = makeRepoMock({
			findSchedulesByStaffId: vi
				.fn()
				.mockReturnValue(Effect.succeed([mockSchedule])),
		});

		const result = await Effect.runPromise(
			Effect.provide(
				getStaffSchedulesProgram(tenantId, staffId),
				makeLayer(repo),
			),
		);

		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe(scheduleId);
		expect(repo.findSchedulesByStaffId).toHaveBeenCalledWith(staffId, tenantId);
	});

	it("propagates DatabaseError", async () => {
		const repo = makeRepoMock({
			findSchedulesByStaffId: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(
					getStaffSchedulesProgram(tenantId, staffId),
					makeLayer(repo),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("saveStaffScheduleProgram", () => {
	const validData = {
		staffId,
		dayOfWeek: 2,
		startTime: "09:00",
		endTime: "18:00",
		isOffDay: false,
	};

	it("saves a staff schedule successfully", async () => {
		const saveSchedule = vi
			.fn()
			.mockReturnValue(
				Effect.succeed({ ...mockSchedule, dayOfWeek: 2, startTime: "09:00" }),
			);
		const repo = makeRepoMock({ saveSchedule });

		const result = await Effect.runPromise(
			Effect.provide(
				saveStaffScheduleProgram(tenantId, validData),
				makeLayer(repo),
			),
		);

		expect(result.dayOfWeek).toBe(2);
		expect(saveSchedule).toHaveBeenCalledOnce();
	});

	it("fails with parse error for invalid data", async () => {
		const invalidData = { staffId: "", dayOfWeek: 7 }; // dayOfWeek 7 is out of range

		await expect(
			Effect.runPromise(
				Effect.provide(
					saveStaffScheduleProgram(tenantId, invalidData),
					makeLayer(makeRepoMock()),
				),
			),
		).rejects.toThrow();
	});

	it("propagates DatabaseError", async () => {
		const repo = makeRepoMock({
			saveSchedule: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(
					saveStaffScheduleProgram(tenantId, validData),
					makeLayer(repo),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("updateStaffScheduleProgram", () => {
	const updateData = {
		id: scheduleId,
		startTime: "10:00",
		endTime: "19:00",
	};

	it("updates a staff schedule successfully", async () => {
		const updatedSchedule = {
			...mockSchedule,
			startTime: "10:00",
			endTime: "19:00",
		};
		const updateSchedule = vi
			.fn()
			.mockReturnValue(Effect.succeed(updatedSchedule));
		const repo = makeRepoMock({ updateSchedule });

		const result = await Effect.runPromise(
			Effect.provide(
				updateStaffScheduleProgram(tenantId, updateData),
				makeLayer(repo),
			),
		);

		expect(result.startTime).toBe("10:00");
		expect(result.endTime).toBe("19:00");
		expect(updateSchedule).toHaveBeenCalledWith(
			scheduleId,
			tenantId,
			expect.objectContaining({ startTime: "10:00" }),
		);
	});

	it("propagates StaffScheduleNotFoundError", async () => {
		const repo = makeRepoMock({
			updateSchedule: vi
				.fn()
				.mockReturnValue(
					Effect.fail(new StaffScheduleNotFoundError({ id: scheduleId })),
				),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(
					updateStaffScheduleProgram(tenantId, updateData),
					makeLayer(repo),
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("StaffScheduleNotFoundError"),
		});
	});
});

describe("deleteStaffScheduleProgram", () => {
	it("deletes a schedule successfully", async () => {
		const deleteSchedule = vi.fn().mockReturnValue(Effect.void);
		const repo = makeRepoMock({ deleteSchedule });

		await Effect.runPromise(
			Effect.provide(
				deleteStaffScheduleProgram(tenantId, scheduleId),
				makeLayer(repo),
			),
		);

		expect(deleteSchedule).toHaveBeenCalledWith(scheduleId, tenantId);
	});

	it("propagates DatabaseError", async () => {
		const repo = makeRepoMock({
			deleteSchedule: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(
					deleteStaffScheduleProgram(tenantId, scheduleId),
					makeLayer(repo),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("getAttendanceProgram", () => {
	const date = "2026-06-20";

	it("returns attendance for a date", async () => {
		const repo = makeRepoMock({
			findAttendanceByDate: vi
				.fn()
				.mockReturnValue(Effect.succeed(mockAttendance)),
		});

		const result = await Effect.runPromise(
			Effect.provide(
				getAttendanceProgram(tenantId, staffId, date),
				makeLayer(repo),
			),
		);

		expect(result?.id).toBe(attendanceId);
		expect(result?.date).toBe(date);
		expect(repo.findAttendanceByDate).toHaveBeenCalledWith(
			staffId,
			date,
			tenantId,
		);
	});

	it("returns null when no attendance found", async () => {
		const repo = makeRepoMock({
			findAttendanceByDate: vi.fn().mockReturnValue(Effect.succeed(null)),
		});

		const result = await Effect.runPromise(
			Effect.provide(
				getAttendanceProgram(tenantId, staffId, date),
				makeLayer(repo),
			),
		);

		expect(result).toBeNull();
	});
});

describe("getStaffAttendanceHistoryProgram", () => {
	it("returns attendance history for a date range", async () => {
		const repo = makeRepoMock({
			findAttendanceByDateRange: vi
				.fn()
				.mockReturnValue(Effect.succeed([mockAttendance])),
		});

		const result = await Effect.runPromise(
			Effect.provide(
				getStaffAttendanceHistoryProgram(
					tenantId,
					staffId,
					"2026-06-01",
					"2026-06-30",
				),
				makeLayer(repo),
			),
		);

		expect(result).toHaveLength(1);
		expect(repo.findAttendanceByDateRange).toHaveBeenCalledWith(
			staffId,
			"2026-06-01",
			"2026-06-30",
			tenantId,
		);
	});
});

describe("clockInProgram", () => {
	const clockInData = {
		staffId,
		date: "2026-06-20",
	};

	it("creates a new attendance on first clock-in", async () => {
		const findAttendanceByDate = vi.fn().mockReturnValue(Effect.succeed(null));
		const saveAttendance = vi
			.fn()
			.mockReturnValue(Effect.succeed(mockAttendance));
		const repo = makeRepoMock({ findAttendanceByDate, saveAttendance });

		const result = await Effect.runPromise(
			Effect.provide(clockInProgram(tenantId, clockInData), makeLayer(repo)),
		);

		expect(result).toBeDefined();
		expect(saveAttendance).toHaveBeenCalledOnce();
		expect(findAttendanceByDate).toHaveBeenCalledWith(
			staffId,
			"2026-06-20",
			tenantId,
		);
	});

	it("returns existing attendance if already clocked in", async () => {
		const findAttendanceByDate = vi
			.fn()
			.mockReturnValue(Effect.succeed(mockAttendance));
		const saveAttendance = vi.fn();
		const repo = makeRepoMock({ findAttendanceByDate, saveAttendance });

		const result = await Effect.runPromise(
			Effect.provide(clockInProgram(tenantId, clockInData), makeLayer(repo)),
		);

		expect(result).toEqual(mockAttendance);
		expect(saveAttendance).not.toHaveBeenCalled();
	});
});

describe("clockOutProgram", () => {
	const clockOutData = {
		staffId,
		date: "2026-06-20",
	};

	it("updates attendance with clock-out time", async () => {
		const findAttendanceByDate = vi
			.fn()
			.mockReturnValue(Effect.succeed({ ...mockAttendance, clockOut: null }));
		const updateAttendance = vi
			.fn()
			.mockReturnValue(
				Effect.succeed({ ...mockAttendance, clockOut: new Date() }),
			);
		const repo = makeRepoMock({ findAttendanceByDate, updateAttendance });

		const result = await Effect.runPromise(
			Effect.provide(clockOutProgram(tenantId, clockOutData), makeLayer(repo)),
		);

		expect(result.clockOut).toBeInstanceOf(Date);
		expect(updateAttendance).toHaveBeenCalledWith(
			attendanceId,
			tenantId,
			expect.objectContaining({ clockOut: expect.any(Date) }),
		);
	});

	it("returns existing attendance if already clocked out", async () => {
		const clockedOutAttendance = {
			...mockAttendance,
			clockOut: new Date(),
		};
		const findAttendanceByDate = vi
			.fn()
			.mockReturnValue(Effect.succeed(clockedOutAttendance));
		const updateAttendance = vi.fn();
		const repo = makeRepoMock({ findAttendanceByDate, updateAttendance });

		const result = await Effect.runPromise(
			Effect.provide(clockOutProgram(tenantId, clockOutData), makeLayer(repo)),
		);

		expect(result).toEqual(clockedOutAttendance);
		expect(updateAttendance).not.toHaveBeenCalled();
	});

	it("throws an error if no clock-in found for the day", async () => {
		const findAttendanceByDate = vi.fn().mockReturnValue(Effect.succeed(null));
		const repo = makeRepoMock({ findAttendanceByDate });

		await expect(
			Effect.runPromise(
				Effect.provide(
					clockOutProgram(tenantId, clockOutData),
					makeLayer(repo),
				),
			),
		).rejects.toThrow("Belum melakukan clock in hari ini");
	});
});
