import { Schema } from "effect";

export const CreateOrderItemSchema = Schema.Struct({
	productId: Schema.String,
	variantId: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	unit: Schema.optionalWith(Schema.String, { exact: true }),
	quantity: Schema.Number.pipe(Schema.nonNegative()),
	priceAtTime: Schema.Number.pipe(Schema.nonNegative()),
	discountType: Schema.optionalWith(
		Schema.NullOr(
			Schema.Union(Schema.Literal("percentage"), Schema.Literal("fixed")),
		),
		{ exact: true },
	),
	discountValue: Schema.optionalWith(Schema.Number.pipe(Schema.nonNegative()), {
		exact: true,
	}),
	discountAmount: Schema.optionalWith(
		Schema.Number.pipe(Schema.nonNegative()),
		{
			exact: true,
		},
	),
});

export const CreateOrderPaymentSchema = Schema.Struct({
	method: Schema.Union(
		Schema.Literal("cash"),
		Schema.Literal("transfer"),
		Schema.Literal("qris"),
	),
	amount: Schema.Number.pipe(Schema.positive()),
});

export const CreateOrderSchema = Schema.Struct({
	branchId: Schema.String,
	customerId: Schema.optionalWith(Schema.NullOr(Schema.String), {
		exact: true,
	}),
	status: Schema.optionalWith(
		Schema.Union(Schema.Literal("draft"), Schema.Literal("completed")),
		{ exact: true },
	),
	discountType: Schema.optionalWith(
		Schema.NullOr(
			Schema.Union(Schema.Literal("percentage"), Schema.Literal("fixed")),
		),
		{ exact: true },
	),
	discountValue: Schema.optionalWith(Schema.Number.pipe(Schema.nonNegative()), {
		exact: true,
	}),
	discountAmount: Schema.optionalWith(
		Schema.Number.pipe(Schema.nonNegative()),
		{ exact: true },
	),
	voucherCode: Schema.optionalWith(Schema.NullOr(Schema.String), {
		exact: true,
	}),
	voucherDiscount: Schema.optionalWith(
		Schema.Number.pipe(Schema.nonNegative()),
		{ exact: true },
	),
	items: Schema.Array(CreateOrderItemSchema).pipe(Schema.minItems(1)),
	payments: Schema.optionalWith(Schema.Array(CreateOrderPaymentSchema), {
		exact: true,
	}),
});

export type TCreateOrderCommand = Schema.Schema.Type<typeof CreateOrderSchema>;

export const UpdateOrderStatusSchema = Schema.Struct({
	status: Schema.Union(
		Schema.Literal("draft"),
		Schema.Literal("confirmed"),
		Schema.Literal("processing"),
		Schema.Literal("shipped"),
		Schema.Literal("delivered"),
		Schema.Literal("cancelled"),
	),
	trackingNumber: Schema.optional(Schema.String),
	shippingCarrier: Schema.optional(Schema.String),
	cancelledReason: Schema.optional(Schema.String),
});

export type TUpdateOrderStatusCommand = Schema.Schema.Type<
	typeof UpdateOrderStatusSchema
>;
