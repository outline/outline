import { Data } from "effect";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type {
	TWhatsAppConfig,
	TWhatsAppConfigId,
	TWhatsAppReminder,
	TWhatsAppReminderId,
	TWhatsAppTemplate,
} from "./whatsapp.types";

export class TWhatsAppError extends Data.TaggedError("WhatsAppError")<{
	readonly message: string;
}> {}

export const WhatsAppModule = {
	mergeConfig: (
		existing: TWhatsAppConfig | null,
		overrides: {
			[K in keyof Pick<
				TWhatsAppConfig,
				| "autoReminder"
				| "reminderHoursBefore"
				| "autoPaymentConfirm"
				| "autoLoyaltyNotify"
				| "autoBookingConfirm"
			>]?: TWhatsAppConfig[K] | undefined;
		},
	): TWhatsAppConfig => ({
		id: existing?.id || (generateId() as TWhatsAppConfigId),
		tenantId: existing?.tenantId || ("" as TTenantId),
		isConnected: existing?.isConnected || false,
		autoReminder: overrides.autoReminder ?? existing?.autoReminder ?? true,
		reminderHoursBefore:
			overrides.reminderHoursBefore ?? existing?.reminderHoursBefore ?? 24,
		autoPaymentConfirm:
			overrides.autoPaymentConfirm ?? existing?.autoPaymentConfirm ?? true,
		autoLoyaltyNotify:
			overrides.autoLoyaltyNotify ?? existing?.autoLoyaltyNotify ?? true,
		autoBookingConfirm:
			overrides.autoBookingConfirm ?? existing?.autoBookingConfirm ?? true,
	}),

	defaultConfig: (tenantId: TTenantId): TWhatsAppConfig => ({
		id: generateId() as TWhatsAppConfigId,
		tenantId,
		isConnected: false,
		autoReminder: true,
		reminderHoursBefore: 24,
		autoPaymentConfirm: true,
		autoLoyaltyNotify: true,
		autoBookingConfirm: true,
	}),

	createReminder: (params: {
		tenantId: TTenantId;
		recipientPhone: string;
		recipientName: string;
		message: string;
		scheduledAt: Date;
		relatedType: TWhatsAppReminder["relatedType"];
		relatedId?: string | null;
	}): TWhatsAppReminder => ({
		id: generateId() as TWhatsAppReminderId,
		tenantId: params.tenantId,
		recipientPhone: params.recipientPhone,
		recipientName: params.recipientName,
		message: params.message,
		scheduledAt: params.scheduledAt,
		status: "pending",
		relatedType: params.relatedType,
		relatedId: params.relatedId || null,
		sentAt: null,
		createdAt: new Date(),
	}),

	renderTemplate: (
		template: TWhatsAppTemplate,
		variables: Record<string, string>,
	): string => {
		let content = template.content;
		for (const [key, value] of Object.entries(variables)) {
			content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
		}
		return content;
	},

	reconstitute: <T>(raw: T): T => ({ ...raw }),
} as const;
