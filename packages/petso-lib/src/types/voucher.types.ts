export type TVoucherDto = {
	readonly code: string;
	readonly name: string;
	readonly description: string;
	readonly type: "percentage" | "fixed";
	readonly value: number;
	readonly minOrderAmount: number;
	readonly maxDiscountAmount: number | null;
	readonly validFrom: string;
	readonly validUntil: string;
};

export type TValidateVoucherInput = {
	readonly code: string;
	readonly orderTotal: number;
};

export type TVoucherValidationResult = {
	readonly valid: boolean;
	readonly discount: number;
	readonly rejectionReason: string | null;
};
