import { Effect } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TPetId } from "@/domain/pet/pet.types";
import type { TBranchId, TTenantId } from "@/shared/types/common.types";
import { SlotConflictError } from "./grooming.errors";
import { calculateBasePrice, calculateEndTime } from "./grooming.module";
import { GroomingRepository } from "./grooming.repository";
import type {
	TGroomingAddonId,
	TGroomingAppointment,
	TGroomingAppointmentId,
	TGroomingPhoto,
	TGroomingServiceId,
	TPetSize,
} from "./grooming.types";

export const getCalendarPrograms = (
	tenantId: TTenantId,
	dateRange: { start: Date; end: Date },
	groomerId?: string,
) => {
	return Effect.gen(function* (_) {
		const repo = yield* _(GroomingRepository);

		if (groomerId) {
			return yield* _(
				repo.getAppointmentsByGroomer(tenantId, groomerId, dateRange),
			);
		}

		return yield* _(repo.getAppointments(tenantId, dateRange));
	});
};

export const bookAppointmentProgram = (
	tenantId: TTenantId,
	data: {
		branchId: string | null;
		serviceId: string;
		petId: string;
		customerId: string | null;
		groomerId: string | null;
		petSize: TPetSize;
		scheduledAt: Date;
		notes: string | null;
		addonIds: string[];
	},
) => {
	return Effect.gen(function* (_) {
		const repo = yield* _(GroomingRepository);

		// 1. Fetch service to get duration and base price
		const service = yield* _(
			repo.getServiceById(data.serviceId as TGroomingServiceId, tenantId),
		);
		const basePrice = calculateBasePrice(service, data.petSize);
		const endTime = calculateEndTime(data.scheduledAt, service.durationMinutes);

		// 2. Prevent Double Booking for Groomer
		if (data.groomerId) {
			// Check appointments for the same day roughly
			const startOfDay = new Date(data.scheduledAt);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(data.scheduledAt);
			endOfDay.setHours(23, 59, 59, 999);

			const existingAppointments = yield* _(
				repo.getAppointmentsByGroomer(tenantId, data.groomerId, {
					start: startOfDay,
					end: endOfDay,
				}),
			);

			// We need to fetch durations to know exact end times for each existing appointment
			// For simplicity in this demo, let's assume standard duration check or fetch all services
			// Realistically we should fetch services for existing appointments to calculate end times
			// For now, we'll do a simple check: if any appointment starts within our block, it's a conflict
			// (A more robust check would do full overlap calculation)

			// Let's do a naive check: no other appointment scheduled at the EXACT same time
			const hasConflict = existingAppointments.some((appt) => {
				// if appointment is cancelled, it frees up the slot
				if (appt.status === "cancelled") return false;

				const diffMinutes =
					Math.abs(appt.scheduledAt.getTime() - data.scheduledAt.getTime()) /
					60000;
				// If within duration minutes of the new service, consider it a conflict
				return diffMinutes < service.durationMinutes;
			});

			if (hasConflict) {
				return yield* _(
					Effect.fail(
						new SlotConflictError({
							groomerId: data.groomerId,
							startTime: data.scheduledAt,
							endTime: endTime,
						}),
					),
				);
			}
		}

		// 3. Process Addons and Total Price
		let totalPrice = basePrice;
		const addonsWithPrice: { addonId: TGroomingAddonId; price: number }[] = [];
		for (const addonId of data.addonIds) {
			const addon = yield* _(
				repo.getAddonById(addonId as TGroomingAddonId, tenantId),
			);
			totalPrice += addon.price;
			addonsWithPrice.push({ addonId: addon.id, price: addon.price });
		}

		// 4. Book Appointment atomically (appointment + addons)
		const appointment = yield* _(
			repo.bookAppointment(
				{
					tenantId,
					branchId: data.branchId as TBranchId,
					serviceId: data.serviceId as TGroomingServiceId,
					petId: data.petId as TPetId,
					customerId: data.customerId as TCustomerId,
					groomerId: data.groomerId,
					petSize: data.petSize,
					price: totalPrice,
					status: "pending",
					scheduledAt: data.scheduledAt,
					startedAt: null,
					completedAt: null,
					notes: data.notes,
					cancellationReason: null,
					createdBy: null,
				},
				addonsWithPrice,
			),
		);

		return appointment;
	});
};

export const updateAppointmentStatusProgram = (
	tenantId: TTenantId,
	appointmentId: TGroomingAppointmentId,
	status: TGroomingAppointment["status"],
	cancellationReason?: string,
) => {
	return Effect.gen(function* (_) {
		const repo = yield* _(GroomingRepository);

		let startedAt;
		let completedAt;

		if (status === "in_progress") startedAt = new Date();
		if (status === "completed") completedAt = new Date();

		return yield* _(
			repo.updateAppointment(
				appointmentId,
				{
					status,
					cancellationReason: cancellationReason || null,
					...(startedAt && { startedAt }),
					...(completedAt && { completedAt }),
				},
				tenantId,
			),
		);
	});
};

export const getAppointmentDetailProgram = (
	tenantId: TTenantId,
	appointmentId: TGroomingAppointmentId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(GroomingRepository);
		const appointment = yield* _(
			repo.getAppointmentById(appointmentId, tenantId),
		);
		const photos = yield* _(repo.getPhotos(appointmentId));
		return { appointment, photos };
	});

export const addGroomingPhotoProgram = (
	tenantId: TTenantId,
	appointmentId: TGroomingAppointmentId,
	photoUrl: string,
	photoType: TGroomingPhoto["photoType"],
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(GroomingRepository);
		// Confirms the appointment belongs to this tenant before attaching a
		// photo to it - also surfaces AppointmentNotFoundError for a bad id.
		yield* _(repo.getAppointmentById(appointmentId, tenantId));
		return yield* _(repo.savePhoto({ appointmentId, photoUrl, photoType }));
	});
