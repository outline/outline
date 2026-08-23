export interface TSupplierDto {
	readonly id: string;
	readonly name: string;
	readonly contactPerson: string | null;
	readonly phone: string | null;
	readonly email: string | null;
	readonly address: string | null;
	readonly notes: string | null;
	readonly isActive: boolean;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface TWarehouseDto {
	readonly id: string;
	readonly tenantId: string;
	readonly branchId: string;
	readonly name: string;
	readonly code: string | null;
	readonly address: string | null;
	readonly isActive: boolean;
	readonly createdAt: string;
	readonly updatedAt: string;
}
