import { Schema } from "@effect/schema";
import { ROOM_TYPE } from "./room.types";

export const CreateRoomSchema = Schema.Struct({
	branchId: Schema.String,
	name: Schema.String.pipe(Schema.nonEmptyString()),
	roomType: Schema.Literal(...ROOM_TYPE),
	capacity: Schema.Number.pipe(Schema.positive()),
	dailyRate: Schema.Number.pipe(Schema.nonNegative()),
	description: Schema.optional(Schema.NullOr(Schema.String)),
	isActive: Schema.optionalWith(Schema.Boolean, { default: () => true }),
	sortOrder: Schema.optionalWith(Schema.Number, { default: () => 0 }),
});

export const UpdateRoomSchema = Schema.Struct({
	branchId: Schema.optional(Schema.NullOr(Schema.String)),
	name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
	roomType: Schema.optional(Schema.Literal(...ROOM_TYPE)),
	capacity: Schema.optional(Schema.Number.pipe(Schema.positive())),
	dailyRate: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
	description: Schema.optional(Schema.NullOr(Schema.String)),
	isActive: Schema.optional(Schema.Boolean),
	sortOrder: Schema.optional(Schema.Number),
});

export const CreateSeasonalPricingSchema = Schema.Struct({
	name: Schema.String.pipe(Schema.nonEmptyString()),
	startDate: Schema.Date,
	endDate: Schema.Date,
	surchargePercent: Schema.optionalWith(Schema.Number, { default: () => 0 }),
	surchargeFixed: Schema.optionalWith(Schema.Number, { default: () => 0 }),
	isActive: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});

export const UpdateSeasonalPricingSchema = Schema.Struct({
	name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
	startDate: Schema.optional(Schema.Date),
	endDate: Schema.optional(Schema.Date),
	surchargePercent: Schema.optional(Schema.Number),
	surchargeFixed: Schema.optional(Schema.Number),
	isActive: Schema.optional(Schema.Boolean),
});
