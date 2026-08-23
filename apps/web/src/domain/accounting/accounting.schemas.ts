import { Schema } from "effect";

export const CreateExpenseSchema = Schema.Struct({
	branchId: Schema.Union(Schema.String, Schema.Null),
	category: Schema.String.pipe(Schema.minLength(1)),
	description: Schema.String.pipe(Schema.minLength(1)),
	amount: Schema.Number.pipe(Schema.positive()),
	expenseDate: Schema.Date,
	paymentMethod: Schema.optionalWith(Schema.String, { default: () => "cash" }),
	receiptUrl: Schema.Union(Schema.String, Schema.Null),
	notes: Schema.Union(Schema.String, Schema.Null),
});

export type CreateExpenseCommand = Schema.Schema.Type<
	typeof CreateExpenseSchema
>;

export const CreatePettyCashSchema = Schema.Struct({
	branchId: Schema.Union(Schema.String, Schema.Null),
	type: Schema.Literal("in", "out"),
	amount: Schema.Number.pipe(Schema.positive()),
	description: Schema.String.pipe(Schema.minLength(1)),
	receiptUrl: Schema.Union(Schema.String, Schema.Null),
	transactionDate: Schema.Date,
});

export type CreatePettyCashCommand = Schema.Schema.Type<
	typeof CreatePettyCashSchema
>;

export const CreateJournalLineSchema = Schema.Struct({
	accountId: Schema.String.pipe(Schema.minLength(1)),
	debit: Schema.Number.pipe(Schema.nonNegative()),
	credit: Schema.Number.pipe(Schema.nonNegative()),
	description: Schema.Union(Schema.String, Schema.Null),
});

export const CreateJournalSchema = Schema.Struct({
	entryDate: Schema.Date,
	description: Schema.Union(Schema.String, Schema.Null),
	referenceType: Schema.Union(Schema.String, Schema.Null),
	referenceId: Schema.Union(Schema.String, Schema.Null),
	lines: Schema.Array(CreateJournalLineSchema).pipe(Schema.minItems(2)),
});

export type CreateJournalCommand = Schema.Schema.Type<
	typeof CreateJournalSchema
>;

export const ProfitLossReportSchema = Schema.Struct({
	startDate: Schema.Date,
	endDate: Schema.Date,
	branchId: Schema.optional(Schema.String),
});

export type ProfitLossReportCommand = Schema.Schema.Type<
	typeof ProfitLossReportSchema
>;
