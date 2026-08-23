import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	ClockInSchema,
	ClockOutSchema,
	CreateStaffScheduleSchema,
	clockInProgram,
	clockOutProgram,
	deleteStaffScheduleProgram,
	getAttendanceProgram,
	getStaffAttendanceHistoryProgram,
	getStaffSchedulesProgram,
	saveStaffScheduleProgram,
	UpdateStaffScheduleSchema,
	updateStaffScheduleProgram,
} from "@/domain/shift";
import type { TStaffId } from "@/domain/staff/staff.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getStaffSchedules = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((staffId: string) => staffId)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		return await runApp(
			getStaffSchedulesProgram(businessId as TTenantId, data as TStaffId),
		);
	});

export const saveStaffSchedule = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) =>
		Schema.decodeUnknownSync(CreateStaffScheduleSchema)(data),
	)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "shift:write"));

		return await runApp(saveStaffScheduleProgram(tenantId, data));
	});

export const updateStaffSchedule = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) =>
		Schema.decodeUnknownSync(UpdateStaffScheduleSchema)(data),
	)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "shift:write"));

		return await runApp(updateStaffScheduleProgram(tenantId, data));
	});

export const deleteStaffSchedule = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "shift:write"));

		return await runApp(deleteStaffScheduleProgram(tenantId, data));
	});

export const getAttendance = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(
		Schema.decodeUnknownSync(
			Schema.Struct({ staffId: Schema.String, date: Schema.String }),
		),
	)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return null;

		return await runApp(
			getAttendanceProgram(
				businessId as TTenantId,
				data.staffId as TStaffId,
				data.date,
			),
		);
	});

export const getStaffAttendanceHistory = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(
		Schema.decodeUnknownSync(
			Schema.Struct({
				staffId: Schema.String,
				startDate: Schema.String,
				endDate: Schema.String,
			}),
		),
	)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		return await runApp(
			getStaffAttendanceHistoryProgram(
				businessId as TTenantId,
				data.staffId as TStaffId,
				data.startDate,
				data.endDate,
			),
		);
	});

export const clockIn = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) => Schema.decodeUnknownSync(ClockInSchema)(data))
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "shift:write"));

		return await runApp(clockInProgram(tenantId, data));
	});

export const clockOut = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) => Schema.decodeUnknownSync(ClockOutSchema)(data))
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "shift:write"));

		return await runApp(clockOutProgram(tenantId, data));
	});
