import { Schema } from "effect";

export const AuditLogFilterSchema = Schema.Struct({
	page: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
	pageSize: Schema.optional(
		Schema.Number.pipe(
			Schema.int(),
			Schema.positive(),
			Schema.lessThanOrEqualTo(100),
		),
	),
	entityType: Schema.optional(Schema.String),
	entityId: Schema.optional(Schema.String),
	action: Schema.optional(Schema.String),
	userId: Schema.optional(Schema.String),
	startDate: Schema.optional(Schema.Date),
	endDate: Schema.optional(Schema.Date),
});

export type AuditLogFilter = Schema.Schema.Type<typeof AuditLogFilterSchema>;
