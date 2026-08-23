import { Schema } from "effect";

export const CreateBatchSchema = Schema.Struct({
	variantId: Schema.String.pipe(Schema.nonEmptyString()),
	batchNumber: Schema.NullOr(Schema.String),
	quantity: Schema.Number.pipe(Schema.greaterThan(0)),
	costPrice: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
	expiryDate: Schema.NullOr(Schema.Date),
	supplierId: Schema.optional(Schema.NullOr(Schema.String)),
	poId: Schema.optional(Schema.NullOr(Schema.String)),
	notes: Schema.optional(Schema.NullOr(Schema.String)),
});

export const AdjustStockSchema = Schema.Struct({
	variantId: Schema.String.pipe(Schema.nonEmptyString()),
	quantity: Schema.Number, // Can be positive or negative
	notes: Schema.String.pipe(Schema.nonEmptyString()),
});

export const DeductStockSchema = Schema.Struct({
	variantId: Schema.String.pipe(Schema.nonEmptyString()),
	quantity: Schema.Number.pipe(Schema.greaterThan(0)),
	referenceType: Schema.Literal("order", "po", "adjustment", "transfer"),
	referenceId: Schema.String.pipe(Schema.nonEmptyString()),
	notes: Schema.optional(Schema.NullOr(Schema.String)),
});
