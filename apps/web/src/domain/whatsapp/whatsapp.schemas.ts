import { Schema } from "effect";

export const WhatsAppConfigSchema = Schema.Struct({
	phoneNumber: Schema.optional(Schema.String),
	autoReminder: Schema.optional(Schema.Boolean),
	reminderHoursBefore: Schema.optional(Schema.Number),
	autoPaymentConfirm: Schema.optional(Schema.Boolean),
	autoLoyaltyNotify: Schema.optional(Schema.Boolean),
	autoBookingConfirm: Schema.optional(Schema.Boolean),
});

export type WhatsAppConfigCommand = Schema.Schema.Type<
	typeof WhatsAppConfigSchema
>;

export const SendWhatsAppMessageSchema = Schema.Struct({
	to: Schema.String.pipe(Schema.minLength(10)),
	message: Schema.String.pipe(Schema.minLength(1)),
});

export type SendWhatsAppMessageCommand = Schema.Schema.Type<
	typeof SendWhatsAppMessageSchema
>;

export const SendWhatsAppTemplateSchema = Schema.Struct({
	to: Schema.String.pipe(Schema.minLength(10)),
	templateName: Schema.String.pipe(Schema.minLength(1)),
	variables: Schema.optional(Schema.Any),
});

export type SendWhatsAppTemplateCommand = Schema.Schema.Type<
	typeof SendWhatsAppTemplateSchema
>;

export const ScheduleReminderSchema = Schema.Struct({
	recipientPhone: Schema.String.pipe(Schema.minLength(10)),
	recipientName: Schema.String.pipe(Schema.minLength(1)),
	message: Schema.String.pipe(Schema.minLength(1)),
	scheduledAt: Schema.DateFromString,
	relatedType: Schema.Union(
		Schema.Literal("booking"),
		Schema.Literal("payment"),
		Schema.Literal("loyalty"),
		Schema.Literal("custom"),
	),
	relatedId: Schema.optional(Schema.String),
});

export type ScheduleReminderCommand = Schema.Schema.Type<
	typeof ScheduleReminderSchema
>;

export const SendReminderSchema = Schema.Struct({
	reminderId: Schema.String,
});

export type SendReminderCommand = Schema.Schema.Type<typeof SendReminderSchema>;
