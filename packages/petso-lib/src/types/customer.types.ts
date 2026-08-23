export type TCustomerDto = {
	readonly id: string;
	readonly name: string;
	readonly email: string | null;
	readonly phone: string | null;
	readonly totalOrders: number;
	readonly totalSpent: number;
	readonly createdAt: string;
};

export interface TCustomerRecordDto {
	readonly id: string;
	readonly businessId: string;
	readonly userId: string | null;
	readonly fullName: string;
	readonly phone: string;
	readonly email: string | null;
	readonly address: string | null;
	readonly notes: string | null;
	readonly isActive: boolean;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export type TCustomerOrderDto = {
	readonly id: string;
	readonly totalAmount: number;
	readonly status: string;
	readonly createdAt: string;
};
