import type { TId, TTenantId } from "@/shared/types/common.types";

export type TSupplierId = TId & { readonly _brand: "SupplierId" };

export type TSupplier = {
	readonly id: TSupplierId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly contactPerson: string | null;
	readonly phone: string | null;
	readonly email: string | null;
	readonly address: string | null;
	readonly notes: string | null;
	readonly isActive: boolean;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};
