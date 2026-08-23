import { Schema } from "effect";

export const CreateStaffScheduleSchema = Schema.Struct({
	staffId: Schema.String.pipe(Schema.nonEmptyString()),
	dayOfWeek: Schema.Number.pipe(Schema.between(0, 6)),
	startTime: Schema.String,
	endTime: Schema.String,
	isOffDay: Schema.Boolean,
});

export const UpdateStaffScheduleSchema = Schema.Struct({
	id: Schema.String.pipe(Schema.nonEmptyString()),
	dayOfWeek: Schema.optional(Schema.Number.pipe(Schema.between(0, 6))),
	startTime: Schema.optional(Schema.String),
	endTime: Schema.optional(Schema.String),
	isOffDay: Schema.optional(Schema.Boolean),
});

export const ClockInSchema = Schema.Struct({
	staffId: Schema.String.pipe(Schema.nonEmptyString()),
	date: Schema.String, // YYYY-MM-DD
	notes: Schema.optional(Schema.NullOr(Schema.String)),
});

export const ClockOutSchema = Schema.Struct({
	staffId: Schema.String.pipe(Schema.nonEmptyString()),
	date: Schema.String, // YYYY-MM-DD
	notes: Schema.optional(Schema.NullOr(Schema.String)),
});
