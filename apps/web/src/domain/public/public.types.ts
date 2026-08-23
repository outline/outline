import type { TId } from "@/shared/types/common.types";

export type TPublicBusinessId = TId & { readonly _brand: "PublicBusinessId" };
export type TPublicBranchId = TId & { readonly _brand: "PublicBranchId" };
export type TPublicRoomId = TId & { readonly _brand: "PublicRoomId" };
export type TPublicProductId = TId & { readonly _brand: "PublicProductId" };

export type TPublicBusiness = {
	readonly id: string;
	readonly name: string;
	readonly slug: string | null;
	readonly logoUrl: string | null;
	readonly address?: string | null;
	readonly phone?: string | null;
};

export type TPublicBranch = {
	readonly id: string;
	readonly businessId: string;
	readonly name: string;
	readonly address: string | null;
	readonly phone: string | null;
	readonly capacity: number;
	readonly isActive: boolean;
};

export type TPublicRoom = {
	readonly id: string;
	readonly businessId: string;
	readonly branchId: string | null;
	readonly name: string;
	readonly description: string | null;
	readonly roomType: string;
	readonly capacity: number;
	readonly dailyRate: number;
	readonly isActive: boolean;
	readonly occupied: number;
	readonly available: number;
};

export type TPublicProduct = {
	readonly id: string;
	readonly businessId: string;
	readonly name: string;
	readonly description: string | null;
	readonly price: number;
	readonly imageUrl: string | null;
	readonly category: string | null;
	readonly isActive: boolean;
	readonly sku: string | null;
	readonly stock: number;
	readonly unit: string | null;
};
