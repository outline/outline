import type { TId, TTenantId, TUserId } from "@/shared/types/common.types";

export type TProfile = {
	readonly id: TId;
	readonly userId: TUserId;
	readonly businessId: TTenantId | null;
	readonly fullName: string | null;
	readonly email: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TBusiness = {
	readonly id: TTenantId;
	readonly name: string;
	readonly slug: string | null;
	readonly logoUrl: string | null;
	readonly signatureUrl: string | null;
	readonly address: string | null;
	readonly phone: string | null;
	readonly createdAt: Date;
};
