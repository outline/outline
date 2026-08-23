export interface TAdvanceDto {
	readonly id: string;
	readonly staffId: string;
	readonly amount: number;
	readonly remaining: number;
	readonly installmentAmount: number;
	readonly notes: string | null;
	readonly status: "active" | "paid_off";
	readonly createdAt: string;
}

export interface TCreateAdvanceInput {
	readonly staffId: string;
	readonly amount: number;
	readonly installmentAmount: number;
	readonly notes: string | null;
}
