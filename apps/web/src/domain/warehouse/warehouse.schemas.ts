import { Schema } from "effect";

export const CreateWarehouseSchema = Schema.Struct({
	branchId: Schema.String,
	name: Schema.String.pipe(Schema.minLength(1)),
	code: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	address: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export type CreateWarehouseCommand = Schema.Schema.Type<
	typeof CreateWarehouseSchema
>;

export const CreateRackLocationSchema = Schema.Struct({
	warehouseId: Schema.String,
	name: Schema.String.pipe(Schema.minLength(1)),
	rack: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	shelf: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	bin: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export type CreateRackLocationCommand = Schema.Schema.Type<
	typeof CreateRackLocationSchema
>;
