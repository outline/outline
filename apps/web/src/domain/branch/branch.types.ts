import type { TId, TTenantId } from "@/shared/types/common.types";

export type TBranchId = TId & { readonly _brand: "BranchId" };
export type TBranchHolidayId = TId & { readonly _brand: "BranchHolidayId" };

export type TDayHours = {
	readonly opens: string;
	readonly closes: string;
	readonly isClosed: boolean;
};

export type TOperatingHours = {
	readonly monday: TDayHours;
	readonly tuesday: TDayHours;
	readonly wednesday: TDayHours;
	readonly thursday: TDayHours;
	readonly friday: TDayHours;
	readonly saturday: TDayHours;
	readonly sunday: TDayHours;
};

export type TBranch = {
	readonly id: TBranchId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly address: string | null;
	readonly phone: string | null;
	readonly isActive: boolean;
	readonly email: string | null;
	readonly whatsappNumber: string | null;
	readonly streetAddress: string | null;
	readonly addressLocality: string | null;
	readonly addressRegion: string | null;
	readonly postalCode: string | null;
	readonly addressCountry: string | null;
	readonly latitude: number | null;
	readonly longitude: number | null;
	readonly operatingHours: TOperatingHours | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TBranchProps = Omit<TBranch, "id" | "createdAt" | "updatedAt">;

export type TBranchHoliday = {
	readonly id: TBranchHolidayId;
	readonly branchId: TBranchId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly date: Date;
	readonly isRecurring: boolean;
	readonly createdAt: Date;
};

export type TBranchHolidayProps = Omit<TBranchHoliday, "id" | "createdAt">;
