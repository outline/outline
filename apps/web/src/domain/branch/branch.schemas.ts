import { Schema } from "effect";

const TimeString = Schema.String.pipe(
	Schema.pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
);

const DayHoursSchema = Schema.Struct({
	opens: TimeString,
	closes: TimeString,
	isClosed: Schema.Boolean,
});

export const OperatingHoursSchema = Schema.Struct({
	monday: DayHoursSchema,
	tuesday: DayHoursSchema,
	wednesday: DayHoursSchema,
	thursday: DayHoursSchema,
	friday: DayHoursSchema,
	saturday: DayHoursSchema,
	sunday: DayHoursSchema,
});

const NullableTrimmedString = (maxLength: number) =>
	Schema.Union(Schema.String.pipe(Schema.maxLength(maxLength)), Schema.Null);

export const BranchSchema = Schema.Struct({
	name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
	address: NullableTrimmedString(500),
	phone: NullableTrimmedString(20),
	email: Schema.Union(
		Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
		Schema.Null,
	),
	whatsappNumber: NullableTrimmedString(20),
	streetAddress: NullableTrimmedString(500),
	addressLocality: NullableTrimmedString(100),
	addressRegion: NullableTrimmedString(100),
	postalCode: NullableTrimmedString(10),
	addressCountry: NullableTrimmedString(2),
	latitude: Schema.Union(
		Schema.Number.pipe(
			Schema.greaterThanOrEqualTo(-90),
			Schema.lessThanOrEqualTo(90),
		),
		Schema.Null,
	),
	longitude: Schema.Union(
		Schema.Number.pipe(
			Schema.greaterThanOrEqualTo(-180),
			Schema.lessThanOrEqualTo(180),
		),
		Schema.Null,
	),
	operatingHours: Schema.Union(OperatingHoursSchema, Schema.Null),
});

export const CreateBranchSchema = BranchSchema;
export type CreateBranchCommand = Schema.Schema.Type<typeof CreateBranchSchema>;

export const UpdateBranchSchema = BranchSchema.pipe(
	Schema.extend(Schema.Struct({ id: Schema.String })),
);
export type UpdateBranchCommand = Schema.Schema.Type<typeof UpdateBranchSchema>;

export const ToggleBranchStatusSchema = Schema.Struct({
	id: Schema.String,
	isActive: Schema.Boolean,
});
export type ToggleBranchStatusCommand = Schema.Schema.Type<
	typeof ToggleBranchStatusSchema
>;

export const CreateBranchHolidaySchema = Schema.Struct({
	branchId: Schema.String,
	name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
	date: Schema.Date,
	isRecurring: Schema.optional(Schema.Boolean),
});
export type CreateBranchHolidayCommand = Schema.Schema.Type<
	typeof CreateBranchHolidaySchema
>;

export const DeleteBranchHolidaySchema = Schema.Struct({
	id: Schema.String,
	branchId: Schema.String,
});
export type DeleteBranchHolidayCommand = Schema.Schema.Type<
	typeof DeleteBranchHolidaySchema
>;
