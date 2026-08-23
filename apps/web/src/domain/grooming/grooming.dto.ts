import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TPetId } from "@/domain/pet/pet.types";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import type {
	TAppointmentStatus,
	TGroomingAddon,
	TGroomingAddonId,
	TGroomingAppointment,
	TGroomingAppointmentAddon,
	TGroomingAppointmentId,
	TGroomingPhoto,
	TGroomingPhotoId,
	TGroomingService,
	TGroomingServiceId,
	TPetSize,
} from "./grooming.types";

// DB types (snake_case)
export type TGroomingServiceRow = {
	id: string;
	business_id: string;
	name: string;
	description: string | null;
	duration_minutes: number;
	price_small: number;
	price_medium: number;
	price_large: number;
	price_xl: number;
	is_active: boolean;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type TGroomingAddonRow = {
	id: string;
	business_id: string;
	name: string;
	price: number;
	is_active: boolean;
	created_at: string;
};

export type TGroomingAppointmentRow = {
	id: string;
	business_id: string;
	branch_id: string | null;
	service_id: string;
	pet_id: string;
	customer_id: string | null;
	groomer_id: string | null;
	pet_size: string;
	price: number;
	status: string;
	scheduled_at: string;
	started_at: string | null;
	completed_at: string | null;
	notes: string | null;
	cancellation_reason: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

export type TGroomingPhotoRow = {
	id: string;
	appointment_id: string;
	photo_url: string;
	photo_type: string;
	uploaded_at: string;
};

export type TGroomingAppointmentAddonRow = {
	id: string;
	appointment_id: string;
	addon_id: string;
	price: number;
};

// DTO Mapping
export function toGroomingService(row: TGroomingServiceRow): TGroomingService {
	return {
		id: row.id as TGroomingServiceId,
		tenantId: row.business_id as TTenantId,
		name: row.name,
		description: row.description,
		durationMinutes: row.duration_minutes,
		priceSmall: row.price_small,
		priceMedium: row.price_medium,
		priceLarge: row.price_large,
		priceXl: row.price_xl,
		isActive: row.is_active,
		sortOrder: row.sort_order,
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
	};
}

export function toGroomingAddon(row: TGroomingAddonRow): TGroomingAddon {
	return {
		id: row.id as TGroomingAddonId,
		tenantId: row.business_id as TTenantId,
		name: row.name,
		price: row.price,
		isActive: row.is_active,
		createdAt: new Date(row.created_at),
	};
}

export function toGroomingAppointment(
	row: TGroomingAppointmentRow,
): TGroomingAppointment {
	return {
		id: row.id as TGroomingAppointmentId,
		tenantId: row.business_id as TTenantId,
		branchId: row.branch_id as TBranchId | null,
		serviceId: row.service_id as TGroomingServiceId,
		petId: row.pet_id as TPetId,
		customerId: row.customer_id as TCustomerId | null,
		groomerId: row.groomer_id,
		petSize: row.pet_size as TPetSize,
		price: row.price,
		status: row.status as TAppointmentStatus,
		scheduledAt: new Date(row.scheduled_at),
		startedAt: row.started_at ? new Date(row.started_at) : null,
		completedAt: row.completed_at ? new Date(row.completed_at) : null,
		notes: row.notes,
		cancellationReason: row.cancellation_reason,
		createdBy: row.created_by as TUserId | null,
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
	};
}

export function toGroomingPhoto(row: TGroomingPhotoRow): TGroomingPhoto {
	return {
		id: row.id as TGroomingPhotoId,
		appointmentId: row.appointment_id as TGroomingAppointmentId,
		photoUrl: row.photo_url,
		photoType: row.photo_type as "before" | "after",
		uploadedAt: new Date(row.uploaded_at),
	};
}

export function toGroomingAppointmentAddon(
	row: TGroomingAppointmentAddonRow,
): TGroomingAppointmentAddon {
	return {
		id: row.id,
		appointmentId: row.appointment_id as TGroomingAppointmentId,
		addonId: row.addon_id as TGroomingAddonId,
		price: row.price,
	};
}
