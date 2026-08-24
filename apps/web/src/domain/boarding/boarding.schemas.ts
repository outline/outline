import { Schema } from "effect";

export const PetSchema = Schema.Struct({
	id: Schema.optional(Schema.String),
	name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
	kind: Schema.Union(
		Schema.Literal("cat"),
		Schema.Literal("dog"),
		Schema.Literal("rabbit"),
		Schema.Literal("other"),
	),
	breed: Schema.String.pipe(Schema.maxLength(50)),
	vaccinated: Schema.Union(Schema.Literal("yes"), Schema.Literal("no")),
	weight: Schema.Union(Schema.String, Schema.Null),
	healthStatus: Schema.String,
	initialCondition: Schema.Union(
		Schema.String.pipe(Schema.maxLength(500)),
		Schema.Null,
	),
	notes: Schema.Union(Schema.String.pipe(Schema.maxLength(500)), Schema.Null),
});

export const CreateBoardingSchema = Schema.Struct({
	businessId: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	branchId: Schema.String,
	customerId: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	ownerName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
	ownerAddress: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(500)),
	ownerPhone: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(20)),
	emergencyContactName: Schema.optional(
		Schema.Union(Schema.String.pipe(Schema.maxLength(100)), Schema.Null),
	),
	emergencyContactPhone: Schema.optional(
		Schema.Union(Schema.String.pipe(Schema.maxLength(20)), Schema.Null),
	),
	checkInDate: Schema.String,
	estimatedCheckOutDate: Schema.Union(Schema.String, Schema.Null),
	notes: Schema.optional(
		Schema.Union(Schema.String.pipe(Schema.maxLength(500)), Schema.Null),
	),
	status: Schema.optional(
		Schema.Union(Schema.Literal("draft"), Schema.Literal("active")),
	),
	ownerSignature: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	roomId: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	dailyRate: Schema.optional(Schema.Number),
	pets: Schema.Array(PetSchema).pipe(Schema.minItems(1)),
	idempotencyKey: Schema.optional(Schema.String),
});

export type CreateBoardingCommand = Schema.Schema.Type<
	typeof CreateBoardingSchema
>;

export const UpdateBoardingStatusSchema = Schema.Struct({
	id: Schema.String,
	status: Schema.Union(
		Schema.Literal("draft"),
		Schema.Literal("active"),
		Schema.Literal("completed"),
		Schema.Literal("cancelled"),
	),
});

export type UpdateBoardingStatusCommand = Schema.Schema.Type<
	typeof UpdateBoardingStatusSchema
>;

export const UpdateBoardingSchema = Schema.Struct({
	id: Schema.String,
	ownerName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
	ownerAddress: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(500)),
	ownerPhone: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(20)),
	emergencyContactName: Schema.Union(
		Schema.String.pipe(Schema.maxLength(100)),
		Schema.Null,
	),
	emergencyContactPhone: Schema.Union(
		Schema.String.pipe(Schema.maxLength(20)),
		Schema.Null,
	),
	checkInDate: Schema.Date,
	estimatedCheckOutDate: Schema.Union(Schema.Date, Schema.Null),
	notes: Schema.Union(Schema.String.pipe(Schema.maxLength(500)), Schema.Null),
	roomId: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	dailyRate: Schema.optional(Schema.Number),
	pets: Schema.Array(PetSchema).pipe(Schema.minItems(1)),
});

export type UpdateBoardingCommand = Schema.Schema.Type<
	typeof UpdateBoardingSchema
>;

export const AddBoardingChargeSchema = Schema.Struct({
	boardingId: Schema.String,
	description: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
	amount: Schema.Number,
});

export type AddBoardingChargeCommand = Schema.Schema.Type<
	typeof AddBoardingChargeSchema
>;

export const AddBoardingDailyPhotoSchema = Schema.Struct({
	boardingId: Schema.String,
	photoUrl: Schema.String.pipe(Schema.minLength(1)),
	caption: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	takenDate: Schema.Date,
});

export type AddBoardingDailyPhotoCommand = Schema.Schema.Type<
	typeof AddBoardingDailyPhotoSchema
>;
