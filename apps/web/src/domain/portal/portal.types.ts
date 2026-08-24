import type { TId, TTenantId } from "@/shared/types/common.types";

export type TPortalConfigId = TId & { readonly _brand: "PortalConfigId" };
export type TPortalServiceId = TId & { readonly _brand: "PortalServiceId" };
export type TPortalBookingId = TId & { readonly _brand: "PortalBookingId" };
export type TPortalReviewId = TId & { readonly _brand: "PortalReviewId" };

export type TPortalConfig = {
	readonly id: TPortalConfigId;
	readonly tenantId: TTenantId;
	readonly slug: string;
	readonly isActive: boolean;
	readonly bookingEnabled: boolean;
	readonly loginEnabled: boolean;
	readonly guestBooking: boolean;
	readonly depositRequired: boolean;
	readonly depositAmount: number;
	readonly logoUrl: string | null;
};

export type TPortalServiceCategory =
	| "freshwater"
	| "saltwater"
	| "terrarium"
	| "other";

export type TPortalService = {
	readonly id: TPortalServiceId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly description: string | null;
	readonly durationMinutes: number;
	readonly price: number;
	readonly isActive: boolean;
	readonly category: TPortalServiceCategory | null;
};

export type TPortalBooking = {
	readonly id: TPortalBookingId;
	readonly tenantId: TTenantId;
	readonly branchId: string;
	readonly serviceId: TPortalServiceId | null;
	readonly roomId: string | null;
	readonly boardingId: string | null;
	readonly idempotencyKey: string;
	readonly customerName: string;
	readonly customerPhone: string;
	readonly customerEmail: string | null;
	readonly petName: string;
	readonly petSpecies: string | null;
	readonly petBreed: string | null;
	readonly scheduledAt: Date;
	readonly estimatedCheckOutAt: Date | null;
	readonly notes: string | null;
	readonly status: "pending" | "confirmed" | "cancelled" | "completed";
	readonly createdAt: Date;
};

export type TPortalReview = {
	readonly id: TPortalReviewId;
	readonly customerName: string;
	readonly rating: number;
	readonly content: string;
	readonly createdAt: string;
	readonly petName?: string;
};

export type TPortalStats = {
	readonly totalReviews: number;
	readonly averageRating: number;
	readonly totalServices: number;
	readonly totalPets: number;
};
