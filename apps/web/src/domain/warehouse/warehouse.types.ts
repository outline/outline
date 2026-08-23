import type { TId, TTenantId } from "@/shared/types/common.types";

export type TWarehouseId = TId & { readonly _brand: "WarehouseId" };
export type TRackLocationId = TId & { readonly _brand: "RackLocationId" };

export type TWarehouse = {
	readonly id: TWarehouseId;
	readonly tenantId: TTenantId;
	readonly branchId: string;
	readonly name: string;
	readonly code: string | null;
	readonly address: string | null;
	readonly isActive: boolean;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TRackLocation = {
	readonly id: TRackLocationId;
	readonly tenantId: TTenantId;
	readonly warehouseId: TWarehouseId;
	readonly name: string;
	readonly rack: string | null;
	readonly shelf: string | null;
	readonly bin: string | null;
	readonly isActive: boolean;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};
