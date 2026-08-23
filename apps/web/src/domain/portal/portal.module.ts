import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type {
	TPortalBooking,
	TPortalBookingId,
	TPortalConfig,
	TPortalConfigId,
	TPortalServiceId,
} from "./portal.types";

export const PortalModule = {
	mergeConfig: (
		existing: TPortalConfig | null,
		overrides: { [K in keyof TPortalConfig]?: TPortalConfig[K] | undefined },
	): TPortalConfig => ({
		id: existing?.id || (generateId() as TPortalConfigId),
		tenantId: overrides.tenantId || (existing?.tenantId as TTenantId),
		slug: overrides.slug ?? existing?.slug ?? "",
		isActive: overrides.isActive ?? existing?.isActive ?? false,
		bookingEnabled:
			overrides.bookingEnabled ?? existing?.bookingEnabled ?? true,
		loginEnabled: overrides.loginEnabled ?? existing?.loginEnabled ?? true,
		guestBooking: overrides.guestBooking ?? existing?.guestBooking ?? false,
		depositRequired:
			overrides.depositRequired ?? existing?.depositRequired ?? true,
		depositAmount: overrides.depositAmount ?? existing?.depositAmount ?? 0,
		logoUrl: overrides.logoUrl ?? existing?.logoUrl ?? null,
	}),

	createBooking: (params: {
		businessId: string;
		branchId?: string | null;
		serviceId?: string | null;
		customerName: string;
		customerPhone: string;
		customerEmail?: string | null;
		petName: string;
		petSpecies?: string | null;
		petBreed?: string | null;
		scheduledAt: Date;
		notes?: string | null;
	}): TPortalBooking => ({
		id: generateId() as TPortalBookingId,
		tenantId: params.businessId as TTenantId,
		branchId: params.branchId ?? null,
		serviceId: params.serviceId ? (params.serviceId as TPortalServiceId) : null,
		customerName: params.customerName,
		customerPhone: params.customerPhone,
		customerEmail: params.customerEmail ?? null,
		petName: params.petName,
		petSpecies: params.petSpecies ?? null,
		petBreed: params.petBreed ?? null,
		scheduledAt: params.scheduledAt,
		notes: params.notes ?? null,
		status: "pending",
		createdAt: new Date(),
	}),

	defaultConfig: (tenantId: TTenantId): TPortalConfig => ({
		id: generateId() as TPortalConfigId,
		tenantId,
		slug: "",
		isActive: false,
		bookingEnabled: true,
		loginEnabled: true,
		guestBooking: false,
		depositRequired: true,
		depositAmount: 0,
		logoUrl: null,
	}),

	reconstitute: <T>(raw: T): T => ({ ...raw }),
} as const;
