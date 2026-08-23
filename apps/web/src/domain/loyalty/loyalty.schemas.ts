import { Schema } from "effect";

export const UpdateLoyaltyConfigSchema = Schema.Struct({
	pointsPerRupiah: Schema.Number.pipe(Schema.positive()),
	pointsExpiryDays: Schema.Number.pipe(Schema.int(), Schema.positive()),
	minRedeemPoints: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
	isActive: Schema.Boolean,
});

export type UpdateLoyaltyConfigCommand = Schema.Schema.Type<
	typeof UpdateLoyaltyConfigSchema
>;

export const EarnPointsSchema = Schema.Struct({
	customerId: Schema.String,
	orderId: Schema.optional(Schema.String),
	amount: Schema.Number.pipe(Schema.positive()),
	description: Schema.optional(Schema.String),
});

export type EarnPointsCommand = Schema.Schema.Type<typeof EarnPointsSchema>;

export const RedeemPointsSchema = Schema.Struct({
	customerId: Schema.String,
	points: Schema.Number.pipe(Schema.int(), Schema.positive()),
	orderId: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
});

export type RedeemPointsCommand = Schema.Schema.Type<typeof RedeemPointsSchema>;

export const CreatePromoCodeSchema = Schema.Struct({
	code: Schema.String.pipe(Schema.minLength(3), Schema.maxLength(20)),
	name: Schema.String.pipe(Schema.minLength(1)),
	description: Schema.optional(Schema.String),
	type: Schema.Union(
		Schema.Literal("percentage"),
		Schema.Literal("fixed"),
		Schema.Literal("free_service"),
	),
	value: Schema.Number.pipe(Schema.positive()),
	minOrderAmount: Schema.optionalWith(
		Schema.Number.pipe(Schema.nonNegative()),
		{
			default: () => 0,
		},
	),
	maxDiscountAmount: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
	maxUses: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
	maxUsesPerCustomer: Schema.optionalWith(
		Schema.Number.pipe(Schema.int(), Schema.positive()),
		{ default: () => 1 },
	),
	validFrom: Schema.Date,
	validUntil: Schema.Date,
});

export type CreatePromoCodeCommand = Schema.Schema.Type<
	typeof CreatePromoCodeSchema
>;

export const ValidatePromoCodeSchema = Schema.Struct({
	code: Schema.String,
	orderTotal: Schema.Number.pipe(Schema.nonNegative()),
	customerLoyaltyId: Schema.optional(Schema.String),
});

export type ValidatePromoCodeCommand = Schema.Schema.Type<
	typeof ValidatePromoCodeSchema
>;

export const ApplyPromoCodeSchema = Schema.Struct({
	code: Schema.String,
	orderTotal: Schema.Number.pipe(Schema.nonNegative()),
	orderId: Schema.String,
	customerLoyaltyId: Schema.optional(Schema.String),
});

export type ApplyPromoCodeCommand = Schema.Schema.Type<
	typeof ApplyPromoCodeSchema
>;

export const CashbackPreviewSchema = Schema.Struct({
	customerId: Schema.String,
	amount: Schema.Number.pipe(Schema.positive()),
});

export type CashbackPreviewCommand = Schema.Schema.Type<
	typeof CashbackPreviewSchema
>;

export const RedeemCashbackSchema = Schema.Struct({
	customerId: Schema.String,
	points: Schema.Number.pipe(Schema.int(), Schema.positive()),
	orderId: Schema.optional(Schema.String),
});

export type RedeemCashbackCommand = Schema.Schema.Type<
	typeof RedeemCashbackSchema
>;

export const AutoEarnCashbackSchema = Schema.Struct({
	customerId: Schema.String,
	orderId: Schema.String,
	amount: Schema.Number.pipe(Schema.positive()),
});

export type AutoEarnCashbackCommand = Schema.Schema.Type<
	typeof AutoEarnCashbackSchema
>;
