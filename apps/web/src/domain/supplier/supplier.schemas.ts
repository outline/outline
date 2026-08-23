import { Schema } from "effect";

export const CreateSupplierSchema = Schema.Struct({
	name: Schema.String.pipe(Schema.nonEmptyString()),
	contactPerson: Schema.optionalWith(Schema.NullOr(Schema.String), {
		exact: true,
	}),
	phone: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	email: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	address: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	notes: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export const UpdateSupplierSchema = Schema.Struct({
	id: Schema.String.pipe(Schema.nonEmptyString()),
	name: Schema.optionalWith(Schema.String.pipe(Schema.nonEmptyString()), {
		exact: true,
	}),
	contactPerson: Schema.optionalWith(Schema.NullOr(Schema.String), {
		exact: true,
	}),
	phone: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	email: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	address: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	notes: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
	isActive: Schema.optionalWith(Schema.Boolean, { exact: true }),
});

export type TCreateSupplierInput = Schema.Schema.Type<
	typeof CreateSupplierSchema
>;
export type TUpdateSupplierInput = Schema.Schema.Type<
	typeof UpdateSupplierSchema
>;
