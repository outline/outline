import { Schema } from "effect";

export const CreateReturnItemSchema = Schema.Struct({
	orderItemId: Schema.String.pipe(Schema.nonEmptyString()),
	qty: Schema.Number.pipe(Schema.greaterThan(0)),
	reason: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	isDamaged: Schema.Boolean,
});

export const CreateReturnSchema = Schema.Struct({
	orderId: Schema.String.pipe(Schema.nonEmptyString()),
	refundMethod: Schema.optionalWith(Schema.NullOr(Schema.String), {
		exact: true,
	}),
	refundAmount: Schema.Number.pipe(Schema.nonNegative()),
	reason: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	items: Schema.Array(CreateReturnItemSchema).pipe(Schema.minItems(1)),
});

export type TCreateReturnInput = Schema.Schema.Type<typeof CreateReturnSchema>;
