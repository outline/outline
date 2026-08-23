import { Schema } from "effect";

export const CreateCommissionRuleSchema = Schema.Struct({
	staffId: Schema.String.pipe(Schema.nonEmptyString()),
	model: Schema.Literal("percentage", "fixed", "size_tier"),
	ratePercent: Schema.Number,
	rateFixed: Schema.Number,
	rateSmall: Schema.Number,
	rateMedium: Schema.Number,
	rateLarge: Schema.Number,
	rateXl: Schema.Number,
	includeAddons: Schema.Boolean,
});

export const UpdateCommissionRuleSchema = Schema.Struct({
	id: Schema.String,
	model: Schema.optional(Schema.Literal("percentage", "fixed", "size_tier")),
	ratePercent: Schema.optional(Schema.Number),
	rateFixed: Schema.optional(Schema.Number),
	rateSmall: Schema.optional(Schema.Number),
	rateMedium: Schema.optional(Schema.Number),
	rateLarge: Schema.optional(Schema.Number),
	rateXl: Schema.optional(Schema.Number),
	includeAddons: Schema.optional(Schema.Boolean),
	isActive: Schema.optional(Schema.Boolean),
});

export const CreateKasbonSchema = Schema.Struct({
	staffId: Schema.String.pipe(Schema.nonEmptyString()),
	amount: Schema.Number.pipe(Schema.greaterThan(0)),
	installmentAmount: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
	notes: Schema.NullOr(Schema.String),
});

export const PayKasbonSchema = Schema.Struct({
	kasbonId: Schema.String.pipe(Schema.nonEmptyString()),
	amount: Schema.Number.pipe(Schema.greaterThan(0)),
	source: Schema.Literal("manual", "commission_deduction"),
});
