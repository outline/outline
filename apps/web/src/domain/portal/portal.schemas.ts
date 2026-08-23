import { Schema } from "effect";

const SlugPattern = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

export const SlugSchema = Schema.String.pipe(
	Schema.minLength(1),
	Schema.maxLength(64),
	Schema.pattern(SlugPattern, {
		description:
			"Slug must be 1-64 lowercase alphanumeric characters or hyphens (cannot start/end with hyphen)",
	}),
);

export const BusinessIdSchema = Schema.UUID;

export const UpdatePortalConfigSchema = Schema.Struct({
	slug: Schema.optional(Schema.String),
	isActive: Schema.optional(Schema.Boolean),
	bookingEnabled: Schema.optional(Schema.Boolean),
	loginEnabled: Schema.optional(Schema.Boolean),
	guestBooking: Schema.optional(Schema.Boolean),
	depositRequired: Schema.optional(Schema.Boolean),
	depositAmount: Schema.optional(Schema.Number),
	logoUrl: Schema.optional(Schema.NullOr(Schema.String)),
});

export type UpdatePortalConfigCommand = Schema.Schema.Type<
	typeof UpdatePortalConfigSchema
>;

export const CreatePortalBookingSchema = Schema.Struct({
	slug: SlugSchema,
	branchId: Schema.optional(Schema.String),
	serviceId: Schema.optional(Schema.String),
	customerName: Schema.String.pipe(Schema.minLength(1)),
	customerPhone: Schema.String.pipe(Schema.minLength(10)),
	customerEmail: Schema.optional(Schema.String),
	petName: Schema.String.pipe(Schema.minLength(1)),
	petSpecies: Schema.optional(Schema.String),
	petBreed: Schema.optional(Schema.String),
	scheduledAt: Schema.Date,
	notes: Schema.optional(Schema.String),
	idempotencyKey: Schema.optional(Schema.String),
});

export type CreatePortalBookingCommand = Schema.Schema.Type<
	typeof CreatePortalBookingSchema
>;

export const UpdatePortalBookingStatusSchema = Schema.Struct({
	bookingId: Schema.String,
	status: Schema.Union(
		Schema.Literal("pending"),
		Schema.Literal("confirmed"),
		Schema.Literal("cancelled"),
		Schema.Literal("completed"),
	),
});

export type UpdatePortalBookingStatusCommand = Schema.Schema.Type<
	typeof UpdatePortalBookingStatusSchema
>;

export const CreatePortalServiceSchema = Schema.Struct({
	name: Schema.String.pipe(Schema.minLength(1)),
	description: Schema.optionalWith(Schema.String, { exact: true }),
	durationMinutes: Schema.Number.pipe(Schema.int(), Schema.positive()),
	price: Schema.Number.pipe(Schema.positive()),
	category: Schema.optionalWith(
		Schema.Literal("freshwater", "saltwater", "terrarium", "other"),
		{ exact: true },
	),
});

export type CreatePortalServiceCommand = Schema.Schema.Type<
	typeof CreatePortalServiceSchema
>;

export const DeletePortalServiceSchema = Schema.String;

export type DeletePortalServiceCommand = Schema.Schema.Type<
	typeof DeletePortalServiceSchema
>;
