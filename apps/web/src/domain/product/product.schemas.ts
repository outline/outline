import { Schema } from "effect";
import { PRODUCT_UNITS } from "./product.types";

const ProductUnitSchema = Schema.Literal(...PRODUCT_UNITS);

export const CreateProductSchema = Schema.Struct({
	name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
	category: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	description: Schema.optional(
		Schema.Union(Schema.String.pipe(Schema.maxLength(500)), Schema.Null),
	),
	brand: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	imageUrl: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	hasVariants: Schema.optional(Schema.Boolean),
	isActive: Schema.optional(Schema.Boolean),
});

export type CreateProductCommand = Schema.Schema.Type<
	typeof CreateProductSchema
>;

export const UpdateProductSchema = CreateProductSchema.pipe(
	Schema.extend(Schema.Struct({ id: Schema.String })),
);

export type UpdateProductCommand = Schema.Schema.Type<
	typeof UpdateProductSchema
>;

// ─── Variant Schemas ────────────────────────────────────────────────────────

export const CreateVariantSchema = Schema.Struct({
	productId: Schema.String,
	name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
	sku: Schema.optional(
		Schema.Union(Schema.String.pipe(Schema.maxLength(50)), Schema.Null),
	),
	barcode: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	price: Schema.Number.pipe(Schema.nonNegative()),
	costPrice: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
	unit: Schema.optional(ProductUnitSchema),
	isFractional: Schema.optional(Schema.Boolean),
	stock: Schema.Number.pipe(Schema.nonNegative()),
	lowStockThreshold: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
	isActive: Schema.optional(Schema.Boolean),
	sortOrder: Schema.optional(Schema.Number),
});

export type CreateVariantCommand = Schema.Schema.Type<
	typeof CreateVariantSchema
>;

export const UpdateVariantSchema = CreateVariantSchema.pipe(
	Schema.extend(Schema.Struct({ id: Schema.String })),
);

export type UpdateVariantCommand = Schema.Schema.Type<
	typeof UpdateVariantSchema
>;
