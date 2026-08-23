import { Schema } from "effect";

export const CreatePaymentSchema = Schema.Struct({
	plan: Schema.Union(Schema.Literal("pro"), Schema.Literal("business")),
	billingCycle: Schema.Union(
		Schema.Literal("monthly"),
		Schema.Literal("yearly"),
	),
});

export type CreatePaymentCommand = Schema.Schema.Type<
	typeof CreatePaymentSchema
>;

export const PaymentCallbackSchema = Schema.Struct({
	orderId: Schema.String,
	transactionStatus: Schema.String,
	transactionId: Schema.optional(Schema.String),
	paymentMethod: Schema.optional(Schema.String),
});

export type PaymentCallbackCommand = Schema.Schema.Type<
	typeof PaymentCallbackSchema
>;
