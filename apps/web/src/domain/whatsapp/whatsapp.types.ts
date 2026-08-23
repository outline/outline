import type { TId, TTenantId } from "@/shared/types/common.types";

export type TWhatsAppConfigId = TId & { readonly _brand: "WhatsAppConfigId" };
export type TWhatsAppTemplateId = TId & {
	readonly _brand: "WhatsAppTemplateId";
};
export type TWhatsAppMessageId = TId & { readonly _brand: "WhatsAppMessageId" };
export type TWhatsAppReminderId = TId & {
	readonly _brand: "WhatsAppReminderId";
};

export type TWhatsAppConfig = {
	readonly id: TWhatsAppConfigId;
	readonly tenantId: TTenantId;
	readonly isConnected: boolean;
	readonly autoReminder: boolean;
	readonly reminderHoursBefore: number;
	readonly autoPaymentConfirm: boolean;
	readonly autoLoyaltyNotify: boolean;
	readonly autoBookingConfirm: boolean;
};

export type TWhatsAppTemplate = {
	readonly id: TWhatsAppTemplateId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly category:
		| "booking"
		| "payment"
		| "loyalty"
		| "promo"
		| "reminder"
		| "custom";
	readonly content: string;
	readonly variables: readonly string[];
	readonly isActive: boolean;
};

export type TSendMessageResult = {
	readonly messageId: string;
	readonly status: "sent" | "failed" | "pending";
};

export type TWhatsAppStats = {
	readonly total: number;
	readonly thisMonth: number;
	readonly scheduled: number;
	readonly failed: number;
};

export type TWhatsAppReminder = {
	readonly id: TWhatsAppReminderId;
	readonly tenantId: TTenantId;
	readonly recipientPhone: string;
	readonly recipientName: string;
	readonly message: string;
	readonly scheduledAt: Date;
	readonly status: "pending" | "sent" | "failed" | "cancelled";
	readonly relatedType: "booking" | "payment" | "loyalty" | "custom";
	readonly relatedId: string | null;
	readonly sentAt: Date | null;
	readonly createdAt: Date;
};
