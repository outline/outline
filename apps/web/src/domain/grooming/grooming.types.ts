import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TPetId } from "@/domain/pet/pet.types";
import type {
	TBranchId,
	TId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";

export type TGroomingServiceId = TId & { readonly _brand: "GroomingServiceId" };
export type TGroomingAppointmentId = TId & {
	readonly _brand: "GroomingAppointmentId";
};
export type TGroomingAddonId = TId & { readonly _brand: "GroomingAddonId" };
export type TGroomingPhotoId = TId & { readonly _brand: "GroomingPhotoId" };

export const PET_SIZE = ["small", "medium", "large", "xl"] as const;
export type TPetSize = (typeof PET_SIZE)[number];

export const APPOINTMENT_STATUS = [
	"pending",
	"confirmed",
	"in_progress",
	"completed",
	"cancelled",
] as const;
export type TAppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

export type TGroomingService = {
	readonly id: TGroomingServiceId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly description: string | null;
	readonly durationMinutes: number;
	readonly priceSmall: number;
	readonly priceMedium: number;
	readonly priceLarge: number;
	readonly priceXl: number;
	readonly isActive: boolean;
	readonly sortOrder: number;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TGroomingAddon = {
	readonly id: TGroomingAddonId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly price: number;
	readonly isActive: boolean;
	readonly createdAt: Date;
};

export type TGroomingAppointment = {
	readonly id: TGroomingAppointmentId;
	readonly tenantId: TTenantId;
	readonly branchId: TBranchId | null;
	readonly serviceId: TGroomingServiceId;
	readonly petId: TPetId;
	readonly customerId: TCustomerId | null;
	readonly groomerId: string | null; // using user_id string to match profiles
	readonly petSize: TPetSize;
	readonly price: number;
	readonly status: TAppointmentStatus;
	readonly scheduledAt: Date;
	readonly startedAt: Date | null;
	readonly completedAt: Date | null;
	readonly notes: string | null;
	readonly cancellationReason: string | null;
	readonly createdBy: TUserId | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TGroomingAppointmentAddon = {
	readonly id: string;
	readonly appointmentId: TGroomingAppointmentId;
	readonly addonId: TGroomingAddonId;
	readonly price: number;
};

export type TGroomingPhoto = {
	readonly id: TGroomingPhotoId;
	readonly appointmentId: TGroomingAppointmentId;
	readonly photoUrl: string;
	readonly photoType: "before" | "after";
	readonly uploadedAt: Date;
};
