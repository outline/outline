export type TCustomerDto = {
	readonly id: string;
	readonly name: string;
	readonly email: string | null;
	readonly phone: string | null;
	readonly totalOrders: number;
	readonly totalSpent: number;
	readonly createdAt: string;
};

export type TCustomerOrderDto = {
	readonly id: string;
	readonly totalAmount: number;
	readonly status: string;
	readonly createdAt: string;
};
