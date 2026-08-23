import { Schema } from "effect";

export const PoItemSchema = Schema.Struct({
	variantId: Schema.String.pipe(Schema.nonEmptyString()),
	qtyOrdered: Schema.Number.pipe(Schema.greaterThan(0)),
	unitCost: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
});

export const CreatePurchaseOrderSchema = Schema.Struct({
	branchId: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	supplierId: Schema.String.pipe(Schema.nonEmptyString()),
	expectedDate: Schema.optionalWith(Schema.NullOr(Schema.Date), {
		exact: true,
	}),
	notes: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	items: Schema.Array(PoItemSchema).pipe(Schema.minItems(1)),
});

export const PoReceivingItemSchema = Schema.Struct({
	poItemId: Schema.String.pipe(Schema.nonEmptyString()),
	qtyReceived: Schema.Number.pipe(Schema.greaterThan(0)),
	expiryDate: Schema.optionalWith(Schema.NullOr(Schema.Date), { exact: true }),
	batchNumber: Schema.optionalWith(Schema.NullOr(Schema.String), {
		exact: true,
	}),
});

export const ReceivePurchaseOrderSchema = Schema.Struct({
	poId: Schema.String.pipe(Schema.nonEmptyString()),
	notes: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	items: Schema.Array(PoReceivingItemSchema).pipe(Schema.minItems(1)),
});

export type TCreatePurchaseOrderInput = Schema.Schema.Type<
	typeof CreatePurchaseOrderSchema
>;
export type TReceivePurchaseOrderInput = Schema.Schema.Type<
	typeof ReceivePurchaseOrderSchema
>;
