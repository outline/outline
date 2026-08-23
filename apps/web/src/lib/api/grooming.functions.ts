import { Schema } from "@effect/schema";
import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import {
	addGroomingPhotoProgram,
	bookAppointmentProgram,
	getAppointmentDetailProgram,
	getCalendarPrograms,
	updateAppointmentStatusProgram,
} from "@/domain/grooming/grooming.programs";
import { GroomingRepository } from "@/domain/grooming/grooming.repository";
import {
	BookAppointmentSchema,
	UpdateAppointmentStatusSchema,
} from "@/domain/grooming/grooming.schemas";
import { getBusinessIdForUser } from "@/domain/identity";
import type { TGroomingAppointmentId } from "@/domain/grooming/grooming.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getGroomingServices = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(
			Effect.gen(function* (_) {
				const repo = yield* _(GroomingRepository);
				return yield* _(repo.getServices(businessId as TTenantId));
			}),
		);
	});

export const getGroomingAddons = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(
			Effect.gen(function* (_) {
				const repo = yield* _(GroomingRepository);
				return yield* _(repo.getAddons(businessId as TTenantId));
			}),
		);
	});

const GetCalendarSchema = Schema.Struct({
	start: Schema.Date,
	end: Schema.Date,
	groomerId: Schema.optional(Schema.String),
});

export const getGroomingCalendar = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(GetCalendarSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(
			getCalendarPrograms(
				businessId as TTenantId,
				{ start: data.start, end: data.end },
				data.groomerId,
			),
		);
	});

export const bookGroomingAppointment = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(BookAppointmentSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "grooming:write"));
		return await runApp(
			bookAppointmentProgram(tenantId, {
				branchId: data.branchId || null,
				serviceId: data.serviceId,
				petId: data.petId,
				customerId: data.customerId || null,
				groomerId: data.groomerId || null,
				petSize: data.petSize,
				scheduledAt: data.scheduledAt,
				notes: data.notes || null,
				addonIds: (data.addonIds as string[]) || [],
			}),
		);
	});

const UpdateStatusInputSchema = Schema.Struct({
	appointmentId: Schema.String,
	statusData: UpdateAppointmentStatusSchema,
});

export const updateGroomingAppointmentStatus = createServerFn({
	method: "POST",
})
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateStatusInputSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "grooming:write"));
		return await runApp(
			updateAppointmentStatusProgram(
				tenantId,
				data.appointmentId as import("@/domain/grooming/grooming.types").TGroomingAppointmentId,
				data.statusData.status,
				data.statusData.cancellationReason || undefined,
			),
		);
	});

const GetAppointmentDetailSchema = Schema.Struct({
	appointmentId: Schema.String,
});

export const getGroomingAppointmentDetail = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(GetAppointmentDetailSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Unauthorized");
		return await runApp(
			getAppointmentDetailProgram(
				businessId as TTenantId,
				data.appointmentId as TGroomingAppointmentId,
			),
		);
	});

const AddGroomingPhotoSchema = Schema.Struct({
	appointmentId: Schema.String,
	photoUrl: Schema.String,
	photoType: Schema.Literal("before", "after"),
});

export const addGroomingPhoto = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(AddGroomingPhotoSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "grooming:write"));
		return await runApp(
			addGroomingPhotoProgram(
				tenantId,
				data.appointmentId as TGroomingAppointmentId,
				data.photoUrl,
				data.photoType,
			),
		);
	});
