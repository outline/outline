import { and, desc, eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	whatsappConfig,
	whatsappMessages,
	whatsappReminders,
	whatsappTemplates,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { IWhatsAppRepository } from "./whatsapp.repository";
import type {
	TWhatsAppConfig,
	TWhatsAppConfigId,
	TWhatsAppReminder,
	TWhatsAppReminderId,
	TWhatsAppStats,
	TWhatsAppTemplate,
	TWhatsAppTemplateId,
} from "./whatsapp.types";

type TConfigRow = typeof whatsappConfig.$inferSelect;
type TTemplateRow = typeof whatsappTemplates.$inferSelect;
type TReminderRow = typeof whatsappReminders.$inferSelect;

const mapConfig = (row: TConfigRow): TWhatsAppConfig => ({
	id: row.id as TWhatsAppConfigId,
	tenantId: row.businessId as TTenantId,
	isConnected: row.isConnected ?? false,
	autoReminder: row.autoReminder ?? false,
	reminderHoursBefore: row.reminderHoursBefore ?? 24,
	autoPaymentConfirm: row.autoPaymentConfirm ?? false,
	autoLoyaltyNotify: row.autoLoyaltyNotify ?? false,
	autoBookingConfirm: row.autoBookingConfirm ?? false,
});

const mapTemplate = (row: TTemplateRow): TWhatsAppTemplate => ({
	id: row.id as TWhatsAppTemplateId,
	tenantId: row.businessId as TTenantId,
	name: row.name,
	category: row.category as TWhatsAppTemplate["category"],
	content: row.content,
	variables: (row.variables as string[] | null) ?? [],
	isActive: row.isActive ?? false,
});

const mapReminder = (row: TReminderRow): TWhatsAppReminder => ({
	id: row.id as TWhatsAppReminderId,
	tenantId: row.businessId as TTenantId,
	recipientPhone: row.recipientPhone,
	recipientName: row.recipientName,
	message: row.message,
	scheduledAt: new Date(row.scheduledAt),
	status: row.status as TWhatsAppReminder["status"],
	relatedType: row.relatedType as TWhatsAppReminder["relatedType"],
	relatedId: row.relatedId ?? null,
	sentAt: row.sentAt ? new Date(row.sentAt) : null,
	createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
});

export const WhatsAppRepositoryDrizzle = Layer.effect(
	IWhatsAppRepository,
	Effect.map(IDrizzleClient, (db) =>
		IWhatsAppRepository.of({
			getConfig: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(whatsappConfig)
								.where(eq(whatsappConfig.businessId, tenantId))
								.limit(1);
							return rows[0] ? mapConfig(rows[0]) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getTemplates: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(whatsappTemplates)
								.where(eq(whatsappTemplates.businessId, tenantId))
								.orderBy(desc(whatsappTemplates.createdAt));
							return rows.map(mapTemplate);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateConfig: (config) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// `whatsapp_config` has a UNIQUE constraint on
							// `business_id`, so we can use INSERT ... ON CONFLICT
							// (which is what the SQL `ON CONFLICT DO UPDATE` translated to
							// when given a partial payload) instead of
							// `ON CONFLICT DO UPDATE`. The id is always present in
							// `config` (the type is non-optional) so it
							// participates as a primary-key column for the
							// fallback path if the unique key is somehow absent.
							await db
								.insert(whatsappConfig)
								.values({
									id: config.id,
									businessId: config.tenantId,
									isConnected: config.isConnected,
									autoReminder: config.autoReminder,
									reminderHoursBefore: config.reminderHoursBefore,
									autoPaymentConfirm: config.autoPaymentConfirm,
									autoLoyaltyNotify: config.autoLoyaltyNotify,
									autoBookingConfirm: config.autoBookingConfirm,
								})
								.onConflictDoUpdate({
									target: whatsappConfig.businessId,
									set: {
										isConnected: config.isConnected,
										autoReminder: config.autoReminder,
										reminderHoursBefore: config.reminderHoursBefore,
										autoPaymentConfirm: config.autoPaymentConfirm,
										autoLoyaltyNotify: config.autoLoyaltyNotify,
										autoBookingConfirm: config.autoBookingConfirm,
										updatedAt: new Date().toISOString(),
									},
								});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveReminder: (reminder) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(whatsappReminders).values({
								id: reminder.id,
								businessId: reminder.tenantId,
								recipientPhone: reminder.recipientPhone,
								recipientName: reminder.recipientName,
								message: reminder.message,
								scheduledAt: reminder.scheduledAt.toISOString(),
								status: reminder.status,
								relatedType: reminder.relatedType,
								relatedId: reminder.relatedId,
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getPendingReminders: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(whatsappReminders)
								.where(
									and(
										eq(whatsappReminders.businessId, tenantId),
										eq(whatsappReminders.status, "pending"),
									),
								)
								.orderBy(whatsappReminders.scheduledAt);
							return rows.map(mapReminder);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getReminder: (tenantId, reminderId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(whatsappReminders)
								.where(
									and(
										eq(whatsappReminders.id, reminderId),
										eq(whatsappReminders.businessId, tenantId),
									),
								)
								.limit(1);
							return rows[0] ? mapReminder(rows[0]) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateReminderStatus: (tenantId, reminderId, status) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const updates: Partial<TReminderRow> =
								status === "sent"
									? { status, sentAt: new Date().toISOString() }
									: { status };
							await db
								.update(whatsappReminders)
								.set(updates)
								.where(
									and(
										eq(whatsappReminders.id, reminderId),
										eq(whatsappReminders.businessId, tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getStats: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const startOfMonth = new Date();
							startOfMonth.setDate(1);
							startOfMonth.setHours(0, 0, 0, 0);
							const _startIso = startOfMonth.toISOString();

							const rows = await db
								.select({
									status: whatsappMessages.status,
									createdAt: whatsappMessages.createdAt,
								})
								.from(whatsappMessages)
								.where(eq(whatsappMessages.businessId, tenantId));

							const total = rows.length;
							const thisMonth = rows.filter((m) => {
								if (!m.createdAt) return false;
								return new Date(m.createdAt) >= startOfMonth;
							}).length;
							const scheduled = rows.filter(
								(m) => m.status === "pending" || m.status === "scheduled",
							).length;
							const failed = rows.filter((m) => m.status === "failed").length;

							return {
								total,
								thisMonth,
								scheduled,
								failed,
							} satisfies TWhatsAppStats;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			deleteTemplate: (tenantId, templateId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.delete(whatsappTemplates)
								.where(
									and(
										eq(whatsappTemplates.id, templateId),
										eq(whatsappTemplates.businessId, tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
