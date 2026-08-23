import { Schema } from "effect";

export const SlugSchema = Schema.String.pipe(
	Schema.minLength(1),
	Schema.maxLength(64),
	Schema.pattern(/^[a-z0-9-]+$/),
);

export const BusinessIdSchema = Schema.UUID;

export const GetPublicProductSchema = Schema.Struct({
	businessId: BusinessIdSchema,
	productId: Schema.UUID,
});

export type GetPublicProductCommand = Schema.Schema.Type<
	typeof GetPublicProductSchema
>;
