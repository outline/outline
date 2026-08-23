import { Schema } from "effect";

export const CreatePetSchema = Schema.Struct({
	customerId: Schema.NullOr(Schema.String),
	name: Schema.String.pipe(Schema.nonEmptyString()),
	species: Schema.Literal("dog", "cat", "rabbit", "bird", "hamster", "other"),
	breed: Schema.NullOr(Schema.String),
	gender: Schema.NullOr(Schema.Literal("male", "female", "unknown")),
	birthDate: Schema.NullOr(Schema.Date),
	weightKg: Schema.NullOr(Schema.Number),
	color: Schema.NullOr(Schema.String),
	isVaccinated: Schema.Boolean,
	vaccineNotes: Schema.NullOr(Schema.String),
	allergies: Schema.NullOr(Schema.String),
	medicalNotes: Schema.NullOr(Schema.String),
	specialInstructions: Schema.NullOr(Schema.String),
	photoUrl: Schema.NullOr(Schema.String),
});

export const UpdatePetSchema = Schema.Struct({
	id: Schema.String,
	customerId: Schema.optional(Schema.NullOr(Schema.String)),
	name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
	species: Schema.optional(
		Schema.Literal("dog", "cat", "rabbit", "bird", "hamster", "other"),
	),
	breed: Schema.optional(Schema.NullOr(Schema.String)),
	gender: Schema.optional(
		Schema.NullOr(Schema.Literal("male", "female", "unknown")),
	),
	birthDate: Schema.optional(Schema.NullOr(Schema.Date)),
	weightKg: Schema.optional(Schema.NullOr(Schema.Number)),
	color: Schema.optional(Schema.NullOr(Schema.String)),
	isVaccinated: Schema.optional(Schema.Boolean),
	vaccineNotes: Schema.optional(Schema.NullOr(Schema.String)),
	allergies: Schema.optional(Schema.NullOr(Schema.String)),
	medicalNotes: Schema.optional(Schema.NullOr(Schema.String)),
	specialInstructions: Schema.optional(Schema.NullOr(Schema.String)),
	photoUrl: Schema.optional(Schema.NullOr(Schema.String)),
	isActive: Schema.optional(Schema.Boolean),
});
