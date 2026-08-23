import { Schema } from "@effect/schema";
import { APPOINTMENT_STATUS, PET_SIZE } from "./grooming.types";

export const CreateGroomingServiceSchema = Schema.Struct({
	name: Schema.String.pipe(Schema.nonEmptyString()),
	description: Schema.NullOr(Schema.String),
	durationMinutes: Schema.Number.pipe(Schema.positive()),
	priceSmall: Schema.Number.pipe(Schema.nonNegative()),
	priceMedium: Schema.Number.pipe(Schema.nonNegative()),
	priceLarge: Schema.Number.pipe(Schema.nonNegative()),
	priceXl: Schema.Number.pipe(Schema.nonNegative()),
	isActive: Schema.optionalWith(Schema.Boolean, { default: () => true }),
	sortOrder: Schema.optionalWith(Schema.Number, { default: () => 0 }),
});

export const UpdateGroomingServiceSchema = Schema.partial(
	CreateGroomingServiceSchema,
);

export const CreateGroomingAddonSchema = Schema.Struct({
	name: Schema.String.pipe(Schema.nonEmptyString()),
	price: Schema.Number.pipe(Schema.nonNegative()),
	isActive: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});

export const UpdateGroomingAddonSchema = Schema.partial(
	CreateGroomingAddonSchema,
);

export const BookAppointmentSchema = Schema.Struct({
	branchId: Schema.optional(Schema.NullOr(Schema.String)),
	serviceId: Schema.String,
	petId: Schema.String,
	customerId: Schema.optional(Schema.NullOr(Schema.String)),
	groomerId: Schema.optional(Schema.NullOr(Schema.String)),
	petSize: Schema.Literal(...PET_SIZE),
	scheduledAt: Schema.Date,
	notes: Schema.optional(Schema.NullOr(Schema.String)),
	addonIds: Schema.optional(Schema.Array(Schema.String)),
});

export const UpdateAppointmentStatusSchema = Schema.Struct({
	status: Schema.Literal(...APPOINTMENT_STATUS),
	cancellationReason: Schema.optional(Schema.NullOr(Schema.String)),
});
