import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	AddonNotFoundError,
	AppointmentNotFoundError,
	GroomingServiceNotFoundError,
} from "./grooming.errors";
import type {
	TGroomingAddon,
	TGroomingAddonId,
	TGroomingAppointment,
	TGroomingAppointmentAddon,
	TGroomingAppointmentId,
	TGroomingPhoto,
	TGroomingService,
	TGroomingServiceId,
} from "./grooming.types";

export interface IGroomingRepository {
	// Services
	getServices(
		tenantId: TTenantId,
	): Effect.Effect<readonly TGroomingService[], DatabaseError>;
	getServiceById(
		id: TGroomingServiceId,
		tenantId: TTenantId,
	): Effect.Effect<
		TGroomingService,
		DatabaseError | GroomingServiceNotFoundError
	>;
	saveService(
		service: Omit<TGroomingService, "id" | "createdAt" | "updatedAt">,
	): Effect.Effect<TGroomingService, DatabaseError>;
	updateService(
		id: TGroomingServiceId,
		updates: Partial<Omit<TGroomingService, "id" | "createdAt" | "updatedAt">>,
		tenantId: TTenantId,
	): Effect.Effect<
		TGroomingService,
		DatabaseError | GroomingServiceNotFoundError
	>;
	deleteService(
		id: TGroomingServiceId,
		tenantId: TTenantId,
	): Effect.Effect<void, DatabaseError | GroomingServiceNotFoundError>;

	// Addons
	getAddons(
		tenantId: TTenantId,
	): Effect.Effect<readonly TGroomingAddon[], DatabaseError>;
	getAddonById(
		id: TGroomingAddonId,
		tenantId: TTenantId,
	): Effect.Effect<TGroomingAddon, DatabaseError | AddonNotFoundError>;

	// Appointments
	getAppointments(
		tenantId: TTenantId,
		dateRange: { start: Date; end: Date },
	): Effect.Effect<readonly TGroomingAppointment[], DatabaseError>;
	getAppointmentsByGroomer(
		tenantId: TTenantId,
		groomerId: string,
		dateRange: { start: Date; end: Date },
	): Effect.Effect<readonly TGroomingAppointment[], DatabaseError>;
	getAppointmentById(
		id: TGroomingAppointmentId,
		tenantId: TTenantId,
	): Effect.Effect<
		TGroomingAppointment,
		DatabaseError | AppointmentNotFoundError
	>;
	bookAppointment(
		appointment: Omit<TGroomingAppointment, "id" | "createdAt" | "updatedAt">,
		addons: readonly { addonId: TGroomingAddonId; price: number }[],
	): Effect.Effect<TGroomingAppointment, DatabaseError>;
	updateAppointment(
		id: TGroomingAppointmentId,
		updates: Partial<
			Omit<TGroomingAppointment, "id" | "createdAt" | "updatedAt">
		>,
		tenantId: TTenantId,
	): Effect.Effect<
		TGroomingAppointment,
		DatabaseError | AppointmentNotFoundError
	>;

	// Appointment Addons
	getAppointmentAddons(
		appointmentId: TGroomingAppointmentId,
	): Effect.Effect<readonly TGroomingAppointmentAddon[], DatabaseError>;

	// Photos
	getPhotos(
		appointmentId: TGroomingAppointmentId,
	): Effect.Effect<readonly TGroomingPhoto[], DatabaseError>;
	savePhoto(
		photo: Omit<TGroomingPhoto, "id" | "uploadedAt">,
	): Effect.Effect<TGroomingPhoto, DatabaseError>;
}

export const GroomingRepository = Context.GenericTag<IGroomingRepository>(
	"@domain/grooming/GroomingRepository",
);
