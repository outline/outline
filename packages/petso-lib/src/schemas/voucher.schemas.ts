import * as Schema from "effect/Schema";

export const ValidatePromoCodeSchema = Schema.Struct({
	code: Schema.String.pipe(Schema.minLength(1)),
	orderTotal: Schema.Number.pipe(Schema.nonNegative()),
});

export type TValidatePromoCodeCommand = Schema.Schema.Type<
	typeof ValidatePromoCodeSchema
>;
